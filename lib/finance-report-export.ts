import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { CategoryContributionReport } from "@/app/actions";
import {
    type ReportBranding,
    type LoadedLogo,
    downloadBlob,
    pdfBrandingHeader,
    pdfFooter,
    excelBrandingRows,
    toCsv,
} from "@/lib/report-shared";

export { loadLogo } from "@/lib/report-shared";
export type { LoadedLogo } from "@/lib/report-shared";

const ksh = (n: number) => `Ksh ${Math.round(n).toLocaleString()}`;
const stamp = () => format(new Date(), "yyyy-MM-dd");

function periodLabel(report: CategoryContributionReport): string {
    const { from, to } = report.period;
    if (from && to) return `${format(new Date(from), "PPP")} – ${format(new Date(to), "PPP")}`;
    if (from) return `From ${format(new Date(from), "PPP")}`;
    if (to) return `Until ${format(new Date(to), "PPP")}`;
    return "All time";
}

function monthLabel(m: string) {
    // m is yyyy-MM
    return format(new Date(`${m}-01T00:00:00`), "MMM yyyy");
}

/* ── CSV ────────────────────────────────────────────────────────────────── */

export function exportFinanceReportCsv(report: CategoryContributionReport, branding?: ReportBranding, generatedBy?: string, detailed = false) {
    const meta: (string | number)[][] = [];
    if (branding) {
        meta.push([branding.name]);
        const parts = [branding.leaderName ? `Led by ${branding.leaderName}` : "", branding.phone || "", branding.email || ""].filter(Boolean);
        if (parts.length) meta.push([parts.join("  ·  ")]);
    }
    meta.push([`Contribution Report — ${report.scope}`]);
    meta.push([`Period: ${periodLabel(report)}`]);
    meta.push([`Generated ${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`]);
    meta.push([]);

    const summaryHead = ["Category", "Status", "Total (Ksh)", "Transactions", "Average (Ksh)", "Share %"];
    const summaryRows = report.categories.map(c => [
        c.name, c.isActive ? "Active" : "Inactive", Math.round(c.total), c.count, Math.round(c.avg), c.share,
    ]);
    const totals = ["TOTAL", "", Math.round(report.grandTotal), report.grandCount, Math.round(report.grandAvg), 100];

    let rows: (string | number)[][] = [...meta, summaryHead, ...summaryRows, totals];

    if (detailed) {
        rows.push([], ["Detailed transactions"], ["Category", "Date", "Reference", "Member", "Amount (Ksh)"]);
        rows = rows.concat(
            report.transactions.map(t => [
                t.categoryName,
                format(new Date(t.date), "yyyy-MM-dd"),
                t.reference,
                t.memberName || "",
                Math.round(t.amount),
            ])
        );
    }

    downloadBlob(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), `contributions_${stamp()}.csv`);
}

/* ── Excel ──────────────────────────────────────────────────────────────── */

export async function exportFinanceReportExcel(report: CategoryContributionReport, branding?: ReportBranding, logo: LoadedLogo | null = null, generatedBy?: string, detailed = false) {
    const workbook = new ExcelJS.Workbook();
    const styleHeader = (row: ExcelJS.Row) => {
        row.font = { bold: true };
        row.eachCell(cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
    };

    // Summary sheet
    const summary = workbook.addWorksheet("Summary");
    [28, 12, 18, 14, 16, 10].forEach((w, i) => (summary.getColumn(i + 1).width = w));
    excelBrandingRows(summary, branding, logo, workbook);
    summary.addRow([`Contribution Report — ${report.scope}`]).font = { bold: true, size: 13 };
    summary.addRow([`Period: ${periodLabel(report)}`]).font = { size: 10 };
    summary.addRow([]);
    styleHeader(summary.addRow(["Category", "Status", "Total", "Transactions", "Average", "Share %"]));
    report.categories.forEach(c => {
        summary.addRow([c.name, c.isActive ? "Active" : "Inactive", Math.round(c.total), c.count, Math.round(c.avg), c.share]);
    });
    const totalRow = summary.addRow(["TOTAL", "", Math.round(report.grandTotal), report.grandCount, Math.round(report.grandAvg), 100]);
    totalRow.font = { bold: true };
    summary.addRow([]);
    summary.addRow(["Generated", `${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`]).font = { italic: true, size: 9 };

    // Monthly trend sheet
    if (report.monthlyTrend.length > 0) {
        const trend = workbook.addWorksheet("Monthly Trend");
        [18, 18].forEach((w, i) => (trend.getColumn(i + 1).width = w));
        styleHeader(trend.addRow(["Month", "Total"]));
        report.monthlyTrend.forEach(m => trend.addRow([monthLabel(m.month), Math.round(m.total)]));
    }

    // Detailed transactions sheet
    if (detailed) {
        const tx = workbook.addWorksheet("Transactions");
        [24, 14, 22, 24, 16].forEach((w, i) => (tx.getColumn(i + 1).width = w));
        styleHeader(tx.addRow(["Category", "Date", "Reference", "Member", "Amount"]));
        report.transactions.forEach(t => tx.addRow([
            t.categoryName, format(new Date(t.date), "yyyy-MM-dd"), t.reference, t.memberName || "", Math.round(t.amount),
        ]));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `contributions_${stamp()}.xlsx`
    );
}

/* ── PDF ────────────────────────────────────────────────────────────────── */

export function exportFinanceReportPdf(report: CategoryContributionReport, branding?: ReportBranding, logo: LoadedLogo | null = null, generatedBy?: string, detailed = false) {
    const doc = new jsPDF();
    let y = pdfBrandingHeader(doc, branding, logo);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Contribution Report — ${report.scope}`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(periodLabel(report), 14, y + 6);
    doc.text(`Total: ${ksh(report.grandTotal)}   ·   ${report.grandCount} transactions   ·   Avg ${ksh(report.grandAvg)}`, 14, y + 12);
    y += 18;

    // Category summary table
    autoTable(doc, {
        startY: y,
        head: [["Category", "Status", "Total", "Txns", "Average", "Share"]],
        body: report.categories.map(c => [
            c.name, c.isActive ? "Active" : "Inactive", ksh(c.total), String(c.count), ksh(c.avg), `${c.share}%`,
        ]),
        foot: [["TOTAL", "", ksh(report.grandTotal), String(report.grandCount), ksh(report.grandAvg), "100%"]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [226, 232, 240], textColor: 20, fontStyle: "bold" },
    });
    // @ts-expect-error lastAutoTable added by plugin
    y = doc.lastAutoTable.finalY + 8;

    // Monthly trend table
    if (report.monthlyTrend.length > 0) {
        doc.setFontSize(12);
        doc.text("Monthly trend", 14, y);
        autoTable(doc, {
            startY: y + 3,
            head: [["Month", "Total"]],
            body: report.monthlyTrend.map(m => [monthLabel(m.month), ksh(m.total)]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129] },
        });
        // @ts-expect-error lastAutoTable added by plugin
        y = doc.lastAutoTable.finalY + 8;
    }

    // Detailed transactions, grouped by category
    if (detailed && report.transactions.length > 0) {
        const byCat = new Map<string, typeof report.transactions>();
        for (const t of report.transactions) {
            const list = byCat.get(t.categoryName) ?? [];
            list.push(t);
            byCat.set(t.categoryName, list);
        }
        for (const [catName, list] of byCat) {
            const subtotal = list.reduce((s, t) => s + t.amount, 0);
            doc.setFontSize(11);
            doc.text(`${catName} — ${ksh(subtotal)} (${list.length})`, 14, y);
            autoTable(doc, {
                startY: y + 3,
                head: [["Date", "Reference", "Member", "Amount"]],
                body: list.map(t => [format(new Date(t.date), "dd MMM yyyy"), t.reference, t.memberName || "", ksh(t.amount)]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [100, 116, 139] },
            });
            // @ts-expect-error lastAutoTable added by plugin
            y = doc.lastAutoTable.finalY + 8;
        }
    }

    pdfFooter(doc, generatedBy);
    downloadBlob(doc.output("blob"), `contributions_${stamp()}.pdf`);
}

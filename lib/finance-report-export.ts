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

function groupByMonth(transactions: CategoryContributionReport["transactions"]) {
    const map = new Map<string, { label: string; txns: typeof transactions; total: number }>();
    for (const t of transactions) {
        const month = t.date.slice(0, 7);
        const entry = map.get(month) ?? {
            label: monthLabel(month),
            txns: [],
            total: 0,
        };
        entry.txns.push(t);
        entry.total += t.amount;
        map.set(month, entry);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a)) // newest first
        .map(([, v]) => v);
}

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
        const multiCat = report.categories.length > 1;
        const months = groupByMonth(report.transactions);
        rows.push([], ["Transactions by Month"]);
        for (const { label, txns, total } of months) {
            rows.push([]);
            rows.push([label, `${txns.length} transaction(s)`, `Total: Ksh ${Math.round(total).toLocaleString()}`]);
            rows.push(multiCat
                ? ["Date", "Reference", "Category", "Member", "Amount (Ksh)"]
                : ["Date", "Reference", "Member", "Amount (Ksh)"]
            );
            for (const t of txns) {
                rows.push(multiCat
                    ? [format(new Date(t.date), "yyyy-MM-dd"), t.reference, t.categoryName, t.memberName || "", Math.round(t.amount)]
                    : [format(new Date(t.date), "yyyy-MM-dd"), t.reference, t.memberName || "", Math.round(t.amount)]
                );
            }
            rows.push(multiCat
                ? ["Subtotal", "", "", "", Math.round(total)]
                : ["Subtotal", "", "", Math.round(total)]
            );
        }
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

    // Detailed transactions sheet — grouped by month
    if (detailed) {
        const multiCat = report.categories.length > 1;
        const tx = workbook.addWorksheet("Transactions by Month");
        (multiCat ? [16, 24, 26, 22, 16] : [16, 24, 22, 16]).forEach((w, i) => (tx.getColumn(i + 1).width = w));

        const months = groupByMonth(report.transactions);
        for (const { label, txns, total } of months) {
            // Month header
            const mRow = tx.addRow([label, `${txns.length} transaction(s)`, ...(multiCat ? ["", ""] : [""]), `Ksh ${Math.round(total).toLocaleString()}`]);
            mRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            mRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
            });

            // Column headers
            styleHeader(tx.addRow(multiCat
                ? ["Date", "Reference", "Category", "Member", "Amount"]
                : ["Date", "Reference", "Member", "Amount"]
            ));

            // Rows
            txns.forEach(t => tx.addRow(multiCat
                ? [format(new Date(t.date), "yyyy-MM-dd"), t.reference, t.categoryName, t.memberName || "", Math.round(t.amount)]
                : [format(new Date(t.date), "yyyy-MM-dd"), t.reference, t.memberName || "", Math.round(t.amount)]
            ));

            // Subtotal
            const subRow = tx.addRow(multiCat
                ? ["Subtotal", "", "", "", Math.round(total)]
                : ["Subtotal", "", "", Math.round(total)]
            );
            subRow.font = { bold: true };
            subRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
            });

            tx.addRow([]); // spacer
        }
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

    // Detailed transactions, grouped by month
    if (detailed && report.transactions.length > 0) {
        const multiCat = report.categories.length > 1;
        const months = groupByMonth(report.transactions);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Transactions by Month", 14, y);
        doc.setFont("helvetica", "normal");
        y += 6;

        for (const { label, txns, total } of months) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`${label}  —  ${ksh(total)}  (${txns.length} txns)`, 14, y);
            doc.setFont("helvetica", "normal");

            const head = multiCat
                ? [["Date", "Reference", "Category", "Member", "Amount"]]
                : [["Date", "Reference", "Member", "Amount"]];
            const body = txns.map(t => multiCat
                ? [format(new Date(t.date), "dd MMM yyyy"), t.reference, t.categoryName, t.memberName || "", ksh(t.amount)]
                : [format(new Date(t.date), "dd MMM yyyy"), t.reference, t.memberName || "", ksh(t.amount)]
            );
            const foot = multiCat
                ? [["Subtotal", "", "", "", ksh(total)]]
                : [["Subtotal", "", "", ksh(total)]];

            autoTable(doc, {
                startY: y + 3,
                head,
                body,
                foot,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [100, 116, 139] },
                footStyles: { fillColor: [226, 232, 240], textColor: 20, fontStyle: "bold" },
            });
            // @ts-expect-error lastAutoTable added by plugin
            y = doc.lastAutoTable.finalY + 8;
        }
    }

    pdfFooter(doc, generatedBy);
    downloadBlob(doc.output("blob"), `contributions_${stamp()}.pdf`);
}

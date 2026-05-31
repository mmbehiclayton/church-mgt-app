import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type {
    SessionReport,
    SessionReportRow,
    ComparisonReport,
    ReportBranding,
} from "@/app/dashboard/attendance/attendance-actions";

export interface LoadedLogo {
    dataUrl: string;
    width: number;
    height: number;
    format: "PNG" | "JPEG";
}

/**
 * Best-effort fetch of the church logo as a data URL (with natural
 * dimensions), so it can be embedded into PDF/Excel. Returns null on any
 * failure (e.g. CORS) — callers should degrade gracefully to text-only.
 */
export async function loadLogo(url: string | null): Promise<LoadedLogo | null> {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = dataUrl;
        });
        const fmt: "PNG" | "JPEG" = /image\/png/i.test(dataUrl) ? "PNG" : "JPEG";
        return { dataUrl, width: dims.width, height: dims.height, format: fmt };
    } catch {
        return null;
    }
}

const TYPE_LABEL: Record<string, string> = {
    SUNDAY_SERVICE: "Sunday Service",
    MIDWEEK_SERVICE: "Midweek Service",
    EVENT: "Event",
    OTHER: "Other",
};

const STATUS_LABEL: Record<string, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    EXCUSED: "Excused",
    NOT_RECORDED: "Not recorded",
};

/** Trigger a browser download for a Blob. */
function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
}

function typeLabel(type: string) {
    return TYPE_LABEL[type] ?? type;
}

function sessionStamp(report: SessionReport) {
    return format(new Date(report.session.date), "yyyy-MM-dd");
}

/** Build a CSV string from rows, escaping quotes. */
function toCsv(rows: (string | number)[][]): string {
    return rows
        .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
}

/** Compact "Led by … · email · phone" line from branding. */
function contactLine(branding?: ReportBranding): string {
    if (!branding) return "";
    const parts: string[] = [];
    if (branding.leaderName) parts.push(`Led by ${branding.leaderName}`);
    if (branding.phone) parts.push(branding.phone);
    if (branding.email) parts.push(branding.email);
    return parts.join("  ·  ");
}

/**
 * Draw the church letterhead (logo + name + contacts) at the top of a PDF.
 * Returns the Y position where body content should start.
 */
function pdfBrandingHeader(doc: jsPDF, branding: ReportBranding | undefined, logo: LoadedLogo | null): number {
    let textX = 14;
    let y = 16;
    if (logo) {
        const h = 18; // mm
        const w = Math.max(8, Math.min(40, (logo.width / logo.height) * h));
        try {
            doc.addImage(logo.dataUrl, logo.format, 14, 12, w, h);
            textX = 14 + w + 5;
        } catch {
            /* ignore bad image */
        }
    }
    if (branding) {
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text(branding.name, textX, y);
        const contact = contactLine(branding);
        if (contact) {
            y += 6;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(contact, textX, y);
        }
    }
    // Divider under the letterhead
    const dividerY = Math.max(y + 4, logo ? 33 : y + 4);
    doc.setDrawColor(200);
    doc.line(14, dividerY, 196, dividerY);
    return dividerY + 7;
}

/** Footer line shown on every PDF page: attribution + page numbers. */
function pdfFooter(doc: jsPDF, generatedBy?: string) {
    const stamp = `Generated ${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`;
    const pageCount = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(130);
        doc.text(stamp, 14, pageH - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 8, { align: "right" });
    }
    doc.setTextColor(0);
}

/** Add a branding metadata block to the top of an ExcelJS worksheet. */
function excelBrandingRows(ws: ExcelJS.Worksheet, branding: ReportBranding | undefined, logo: LoadedLogo | null, workbook: ExcelJS.Workbook) {
    if (branding) {
        const nameRow = ws.addRow([branding.name]);
        nameRow.font = { bold: true, size: 14 };
        const contact = contactLine(branding);
        if (contact) ws.addRow([contact]).font = { size: 10 };
    }
    // Float the logo to the right of the metadata (cols A/B) so they don't overlap.
    if (logo) {
        try {
            const ratio = logo.width / logo.height;
            const imageId = workbook.addImage({
                base64: logo.dataUrl,
                extension: logo.format === "PNG" ? "png" : "jpeg",
            });
            ws.addImage(imageId, { tl: { col: 4, row: 0 }, ext: { width: Math.round(64 * ratio), height: 64 } });
        } catch {
            /* ignore */
        }
    }
    ws.addRow([]);
}

/* ── Single-session exports ─────────────────────────────────────────────── */

function rosterRows(rows: SessionReportRow[]) {
    return rows.map((r, i) => [
        i + 1,
        r.fullName,
        r.phoneNumber || "",
        r.gender || "",
        r.fellowshipName,
        r.departments.join(", ") || "—",
        STATUS_LABEL[r.status] ?? r.status,
        r.notes || "",
    ]);
}

export function exportSessionReportCsv(report: SessionReport, filteredRows: SessionReportRow[], branding?: ReportBranding, generatedBy?: string) {
    const meta: (string | number)[][] = [];
    if (branding) {
        meta.push([branding.name]);
        const contact = contactLine(branding);
        if (contact) meta.push([contact]);
        meta.push([`${typeLabel(report.session.type)} — ${format(new Date(report.session.date), "PPP")}`]);
        meta.push([`Generated ${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`]);
        meta.push([]);
    }
    const header = ["#", "Name", "Phone", "Gender", "Fellowship", "Departments", "Status", "Notes"];
    const csv = toCsv([...meta, header, ...rosterRows(filteredRows)]);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `attendance_${report.session.type.toLowerCase()}_${sessionStamp(report)}.csv`);
}

export async function exportSessionReportExcel(report: SessionReport, filteredRows: SessionReportRow[], branding?: ReportBranding, logo: LoadedLogo | null = null, generatedBy?: string) {
    const workbook = new ExcelJS.Workbook();
    const dateStr = format(new Date(report.session.date), "PPP");

    const styleHeader = (row: ExcelJS.Row) => {
        row.font = { bold: true };
        row.eachCell(cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
            cell.border = {
                top: { style: "thin" }, left: { style: "thin" },
                bottom: { style: "thin" }, right: { style: "thin" },
            };
        });
    };

    // Summary sheet
    const summary = workbook.addWorksheet("Summary");
    summary.getColumn(1).width = 24;
    summary.getColumn(2).width = 28;
    excelBrandingRows(summary, branding, logo, workbook);
    summary.addRow(["Attendance Report", ""]).font = { bold: true, size: 14 };
    summary.addRow(["Service", typeLabel(report.session.type)]);
    summary.addRow(["Date", dateStr]);
    summary.addRow(["Status", report.session.status]);
    if (report.session.description) summary.addRow(["Description", report.session.description]);
    summary.addRow([]);
    const sumHeader = summary.addRow(["Metric", "Count"]);
    styleHeader(sumHeader);
    summary.addRow(["Present", report.summary.present]);
    summary.addRow(["Absent", report.summary.absent]);
    summary.addRow(["Excused", report.summary.excused]);
    if (report.summary.notRecorded > 0) summary.addRow(["Not recorded", report.summary.notRecorded]);
    summary.addRow(["Total members", report.summary.total]);
    summary.addRow(["Attendance rate", `${report.summary.rate}%`]);
    summary.addRow([]);
    summary.addRow(["Generated", `${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`]).font = { italic: true, size: 9 };

    // Roster sheets per status
    const addRoster = (name: string, rows: SessionReportRow[]) => {
        const ws = workbook.addWorksheet(name);
        [6, 22, 16, 10, 22, 28, 14, 30].forEach((w, i) => (ws.getColumn(i + 1).width = w));
        const head = ws.addRow(["#", "Name", "Phone", "Gender", "Fellowship", "Departments", "Status", "Notes"]);
        styleHeader(head);
        rosterRows(rows).forEach(r => ws.addRow(r));
    };
    addRoster("Present", filteredRows.filter(r => r.status === "PRESENT"));
    addRoster("Absent", filteredRows.filter(r => r.status === "ABSENT"));
    addRoster("Excused", filteredRows.filter(r => r.status === "EXCUSED"));

    // Watchlist
    if (report.watchlist.length > 0) {
        const ws = workbook.addWorksheet("Watchlist");
        [6, 24, 16, 24].forEach((w, i) => (ws.getColumn(i + 1).width = w));
        const head = ws.addRow(["#", "Name", "Phone", "Fellowship"]);
        styleHeader(head);
        report.watchlist.forEach((m, i) => ws.addRow([i + 1, m.fullName, m.phoneNumber || "", m.fellowshipName]));
    }

    // By fellowship
    const fws = workbook.addWorksheet("By Fellowship");
    [28, 12, 12, 12, 12].forEach((w, i) => (fws.getColumn(i + 1).width = w));
    const fHead = fws.addRow(["Fellowship", "Present", "Absent", "Excused", "Total"]);
    styleHeader(fHead);
    report.byFellowship.forEach(g => fws.addRow([g.label, g.present, g.absent, g.excused, g.total]));

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `attendance_${report.session.type.toLowerCase()}_${sessionStamp(report)}.xlsx`
    );
}

export function exportSessionReportPdf(report: SessionReport, filteredRows: SessionReportRow[], branding?: ReportBranding, logo: LoadedLogo | null = null, generatedBy?: string) {
    const doc = new jsPDF();
    const dateStr = format(new Date(report.session.date), "PPP");

    let startY = pdfBrandingHeader(doc, branding, logo);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Attendance Report", 14, startY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${typeLabel(report.session.type)} · ${dateStr}`, 14, startY + 6);
    doc.text(
        `Present: ${report.summary.present}   Absent: ${report.summary.absent}   Excused: ${report.summary.excused}   Rate: ${report.summary.rate}%`,
        14,
        startY + 12
    );

    startY = startY + 18;
    const section = (title: string, rows: SessionReportRow[], withNotes: boolean, fill: [number, number, number]) => {
        if (rows.length === 0) return;
        doc.setFontSize(12);
        doc.text(`${title} (${rows.length})`, 14, startY);
        const head = withNotes
            ? [["#", "Name", "Phone", "Gender", "Fellowship", "Notes"]]
            : [["#", "Name", "Phone", "Gender", "Fellowship"]];
        autoTable(doc, {
            startY: startY + 3,
            head,
            body: rows.map((r, i) => {
                const base = [i + 1, r.fullName, r.phoneNumber || "", r.gender || "", r.fellowshipName];
                return withNotes ? [...base, r.notes || ""] : base;
            }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: fill },
        });
        // @ts-expect-error lastAutoTable is added by the autotable plugin
        startY = doc.lastAutoTable.finalY + 8;
    };

    const presentRows = filteredRows.filter(r => r.status === "PRESENT");
    const absentRows = filteredRows.filter(r => r.status === "ABSENT" || r.status === "NOT_RECORDED");
    const excusedRows = filteredRows.filter(r => r.status === "EXCUSED");

    if (presentRows.length === 0 && absentRows.length === 0 && excusedRows.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("No members match the selected filters.", 14, startY);
        doc.setTextColor(0);
    } else {
        section("Present", presentRows, false, [16, 185, 129]);
        section("Absent", absentRows, true, [239, 68, 68]);
        section("Excused", excusedRows, true, [217, 119, 6]);
    }

    if (report.watchlist.length > 0) {
        doc.setFontSize(12);
        doc.text(`Watchlist (${report.watchlist.length})`, 14, startY);
        autoTable(doc, {
            startY: startY + 3,
            head: [["#", "Name", "Phone", "Fellowship"]],
            body: report.watchlist.map((m, i) => [i + 1, m.fullName, m.phoneNumber || "", m.fellowshipName]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [217, 119, 6] },
        });
    }

    pdfFooter(doc, generatedBy);
    downloadBlob(doc.output("blob"), `attendance_${report.session.type.toLowerCase()}_${sessionStamp(report)}.pdf`);
}

/* ── Comparison exports ─────────────────────────────────────────────────── */

function compStamp() {
    return format(new Date(), "yyyy-MM-dd");
}

function comparisonMatrix(report: ComparisonReport) {
    const head = ["Metric", ...report.sessions.map(s => `${typeLabel(s.type)} ${format(new Date(s.date), "dd MMM")}`)];
    const rows: (string | number)[][] = [
        ["Present", ...report.sessions.map(s => s.present)],
        ["Absent", ...report.sessions.map(s => s.absent)],
        ["Excused", ...report.sessions.map(s => s.excused)],
        ["Total", ...report.sessions.map(s => s.total)],
        ["Rate %", ...report.sessions.map(s => s.rate)],
    ];
    return { head, rows };
}

export function exportComparisonCsv(report: ComparisonReport, branding?: ReportBranding, generatedBy?: string) {
    const { head, rows } = comparisonMatrix(report);
    const meta: (string | number)[][] = [];
    if (branding) {
        meta.push([branding.name]);
        const contact = contactLine(branding);
        if (contact) meta.push([contact]);
        meta.push([`Attendance Comparison — ${report.sessions.length} services`]);
        meta.push([`Generated ${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`]);
        meta.push([]);
    }
    downloadBlob(new Blob([toCsv([...meta, head, ...rows])], { type: "text/csv;charset=utf-8" }), `attendance_comparison_${compStamp()}.csv`);
}

export async function exportComparisonExcel(report: ComparisonReport, branding?: ReportBranding, logo: LoadedLogo | null = null, generatedBy?: string) {
    const workbook = new ExcelJS.Workbook();
    const styleHeader = (row: ExcelJS.Row) => {
        row.font = { bold: true };
        row.eachCell(cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        });
    };

    const cmp = workbook.addWorksheet("Comparison");
    const { head, rows } = comparisonMatrix(report);
    cmp.getColumn(1).width = 16;
    report.sessions.forEach((_, i) => (cmp.getColumn(i + 2).width = 20));
    excelBrandingRows(cmp, branding, logo, workbook);
    styleHeader(cmp.addRow(head));
    rows.forEach(r => cmp.addRow(r));

    const present = workbook.addWorksheet("Present at all");
    [6, 24, 16, 24].forEach((w, i) => (present.getColumn(i + 1).width = w));
    styleHeader(present.addRow(["#", "Name", "Phone", "Fellowship"]));
    report.consistentlyPresent.forEach((m, i) => present.addRow([i + 1, m.fullName, m.phoneNumber || "", m.fellowshipName]));

    const absent = workbook.addWorksheet("Missed all");
    [6, 24, 16, 24].forEach((w, i) => (absent.getColumn(i + 1).width = w));
    styleHeader(absent.addRow(["#", "Name", "Phone", "Fellowship"]));
    report.consistentlyAbsent.forEach((m, i) => absent.addRow([i + 1, m.fullName, m.phoneNumber || "", m.fellowshipName]));

    cmp.addRow([]);
    cmp.addRow([`Generated ${generatedBy ? `by ${generatedBy} ` : ""}on ${format(new Date(), "PPP p")}`]).font = { italic: true, size: 9 };

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `attendance_comparison_${compStamp()}.xlsx`
    );
}

export function exportComparisonPdf(report: ComparisonReport, branding?: ReportBranding, logo: LoadedLogo | null = null, generatedBy?: string) {
    const doc = new jsPDF();
    const headerY = pdfBrandingHeader(doc, branding, logo);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Attendance Comparison", 14, headerY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${report.sessions.length} services compared`, 14, headerY + 6);

    const { head, rows } = comparisonMatrix(report);
    autoTable(doc, {
        startY: headerY + 12,
        head: [head],
        body: rows.map(r => r.map(String)),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
    });

    // @ts-expect-error lastAutoTable is added by the autotable plugin
    let y = doc.lastAutoTable.finalY + 8;
    if (report.consistentlyAbsent.length > 0) {
        doc.setFontSize(12);
        doc.text(`Missed all services (${report.consistentlyAbsent.length})`, 14, y);
        autoTable(doc, {
            startY: y + 3,
            head: [["#", "Name", "Phone", "Fellowship"]],
            body: report.consistentlyAbsent.map((m, i) => [i + 1, m.fullName, m.phoneNumber || "", m.fellowshipName]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [217, 119, 6] },
        });
        // @ts-expect-error lastAutoTable is added by the autotable plugin
        y = doc.lastAutoTable.finalY + 8;
    }
    if (report.consistentlyPresent.length > 0) {
        doc.setFontSize(12);
        doc.text(`Present at all services (${report.consistentlyPresent.length})`, 14, y);
        autoTable(doc, {
            startY: y + 3,
            head: [["#", "Name", "Phone", "Fellowship"]],
            body: report.consistentlyPresent.map((m, i) => [i + 1, m.fullName, m.phoneNumber || "", m.fellowshipName]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129] },
        });
    }

    pdfFooter(doc, generatedBy);
    downloadBlob(doc.output("blob"), `attendance_comparison_${compStamp()}.pdf`);
}

import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { format } from "date-fns";

/** Church letterhead details used across report exports. */
export interface ReportBranding {
    name: string;
    leaderName: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
}

export interface LoadedLogo {
    dataUrl: string;
    width: number;
    height: number;
    format: "PNG" | "JPEG";
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
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

/** Compact "Led by … · phone · email" line from branding. */
export function contactLine(branding?: ReportBranding): string {
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
export function pdfBrandingHeader(doc: jsPDF, branding: ReportBranding | undefined, logo: LoadedLogo | null): number {
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
    const dividerY = Math.max(y + 4, logo ? 33 : y + 4);
    doc.setDrawColor(200);
    doc.line(14, dividerY, 196, dividerY);
    return dividerY + 7;
}

/** Footer line shown on every PDF page: attribution + page numbers. */
export function pdfFooter(doc: jsPDF, generatedBy?: string) {
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

/** Add a branding metadata block (name + contacts, with optional logo) to a sheet. */
export function excelBrandingRows(ws: ExcelJS.Worksheet, branding: ReportBranding | undefined, logo: LoadedLogo | null, workbook: ExcelJS.Workbook) {
    if (branding) {
        const nameRow = ws.addRow([branding.name]);
        nameRow.font = { bold: true, size: 14 };
        const contact = contactLine(branding);
        if (contact) ws.addRow([contact]).font = { size: 10 };
    }
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

/** Build a CSV string from rows, escaping quotes. */
export function toCsv(rows: (string | number)[][]): string {
    return rows
        .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
}

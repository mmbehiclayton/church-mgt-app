"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown, FileText, FileSpreadsheet } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { getTransactions } from "@/app/actions";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Category { id: string; name: string; }
interface OrgBranding { name: string; leaderName: string | null; email: string | null; phone: string | null; }

export default function ExportButtons({ categories, branding, asMenuItem = false }: {
    categories: Category[];
    branding?: OrgBranding;
    asMenuItem?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [openStartDate, setOpenStartDate] = useState(false);
    const [openEndDate, setOpenEndDate] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [openCategory, setOpenCategory] = useState(false);

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    async function fetchData() {
        const filters = {
            startDate,
            endDate: endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })() : undefined,
            categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
        };
        const data = await getTransactions(filters);
        return [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    function orgLabel() {
        return (branding?.name || "CHURCH").toUpperCase();
    }

    function categoryLabel() {
        if (selectedCategories.length === 1) {
            return categories.find(c => c.id === selectedCategories[0])?.name.toUpperCase() ?? "COMBINED";
        }
        return selectedCategories.length > 1 ? "COMBINED" : "GENERAL";
    }

    function fileName(ext: string) {
        return `${orgLabel()} ${categoryLabel()} SUPPORT ${new Date().getFullYear()}.${ext}`;
    }

    function downloadBlob(blob: Blob, name: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function extractTime(rawMessage: string) {
        return rawMessage.match(/at\s+(\d{1,2}:\d{2}(?:\s?[AP]M)?)/i)?.[1] ?? null;
    }

    async function handleExportExcel() {
        setLoading(true);
        try {
            const transactions = await fetchData();
            if (transactions.length === 0) {
                toast.warning("No transactions found", { description: "Adjust the filters and try again." });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet("Transactions");

            const catNames = selectedCategories.length > 0
                ? categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join(", ")
                : "All Categories";

            ws.addRow(["REGION:", branding?.name || "Church"]);
            if (branding?.leaderName) ws.addRow(["BISHOP'S NAME:", branding.leaderName]);
            if (branding?.phone)      ws.addRow(["BISHOP'S PHONE:", branding.phone]);
            if (branding?.email)      ws.addRow(["EMAIL:", branding.email]);
            ws.addRow(["CATEGORY:", catNames]);
            const metaCount = ws.rowCount;
            ws.addRow([]);

            for (let i = 1; i <= metaCount; i++) ws.getCell(`A${i}`).font = { bold: true };

            [20, 15, 15, 20, 15, 10].forEach((w, i) => (ws.getColumn(i + 1).width = w));

            const headerRow = ws.addRow(["Reference Number", "Amount", "Bank", "Account Number", "Date", "Time"]);
            headerRow.font = { bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
            });

            let total = 0;
            transactions.forEach(t => {
                const dateObj = new Date(t.transactionDate);
                total += t.amount;
                ws.addRow([
                    t.reference,
                    t.amount,
                    t.bank || "",
                    t.account || "",
                    format(dateObj, "d/M/yyyy"),
                    extractTime(t.rawMessage) || t.transactionTime || format(dateObj, "HH:mm"),
                ]);
            });

            const totalRow = ws.addRow(["TOTAL", total]);
            totalRow.font = { bold: true };

            const startR = headerRow.number;
            const endR = totalRow.number;
            for (let i = startR; i <= endR; i++) {
                ws.getRow(i).eachCell({ includeEmpty: true }, (cell, col) => {
                    if (col <= 6) cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName("xlsx"));
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Export failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleExportPDF() {
        setLoading(true);
        try {
            const transactions = await fetchData();
            if (transactions.length === 0) {
                toast.warning("No transactions found", { description: "Adjust the filters and try again." });
                return;
            }

            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text(`${branding?.name || "Church"} — Transactions Report`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
            if (startDate && endDate) {
                doc.text(`Period: ${format(startDate, "PPP")} – ${format(endDate, "PPP")}`, 14, 34);
            }

            autoTable(doc, {
                startY: startDate && endDate ? 40 : 34,
                head: [["Date", "Reference", "Category", "Bank", "Amount"]],
                body: transactions.map(t => [
                    format(new Date(t.transactionDate), "dd MMM yyyy"),
                    t.reference,
                    t.category?.name || "—",
                    t.bank || "—",
                    `Ksh ${t.amount.toLocaleString()}`,
                ]),
                foot: [["", "", "", "TOTAL", `Ksh ${transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}`]],
                styles: { fontSize: 8 },
                headStyles: { fillColor: [37, 99, 235] },
                footStyles: { fillColor: [226, 232, 240], fontStyle: "bold" },
            });

            downloadBlob(doc.output("blob"), fileName("pdf"));
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Export failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleExportCsv() {
        setLoading(true);
        try {
            const transactions = await fetchData();
            if (transactions.length === 0) {
                toast.warning("No transactions found", { description: "Adjust the filters and try again." });
                return;
            }

            const escape = (v: string | number) => {
                const s = String(v);
                return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const row = (cells: (string | number)[]) => cells.map(escape).join(",");

            const catNames = selectedCategories.length > 0
                ? categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join("; ")
                : "All Categories";

            const lines: string[] = [
                row([branding?.name || "Church"]),
                row([`Category: ${catNames}`]),
                row([`Generated: ${format(new Date(), "PPP p")}`]),
                "",
                row(["Date", "Reference", "Category", "Bank", "Account", "Amount (Ksh)"]),
                ...transactions.map(t => row([
                    format(new Date(t.transactionDate), "yyyy-MM-dd"),
                    t.reference,
                    t.category?.name || "",
                    t.bank || "",
                    t.account || "",
                    Math.round(t.amount),
                ])),
                row(["", "", "", "", "TOTAL", Math.round(transactions.reduce((s, t) => s + t.amount, 0))]),
            ];

            downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), fileName("csv"));
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Export failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {asMenuItem ? (
                <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </DropdownMenuItem>
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Export Transactions</DialogTitle>
                    <DialogDescription>
                        Filter by category and date range, then choose your export format.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-4">
                        {([
                            { label: "Start Date", date: startDate, setDate: setStartDate, open: openStartDate, setOpen: setOpenStartDate },
                            { label: "End Date", date: endDate, setDate: setEndDate, open: openEndDate, setOpen: setOpenEndDate },
                        ] as const).map(({ label, date, setDate, open: o, setOpen: sO }) => (
                            <div key={label} className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label>{label}</Label>
                                    {date && (
                                        <button onClick={() => setDate(undefined)} className="text-xs text-muted-foreground hover:text-foreground">
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <Popover open={o} onOpenChange={sO}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>No filter</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <div className="p-2">
                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                            <div className="mt-2 flex justify-end">
                                                <Button size="sm" onClick={() => sO(false)}>Confirm</Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ))}
                    </div>

                    {/* Category filter */}
                    <div className="grid gap-2">
                        <Label>Categories</Label>
                        <Popover open={openCategory} onOpenChange={setOpenCategory}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : "All categories"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search category..." />
                                    <CommandList>
                                        <CommandEmpty>No category found.</CommandEmpty>
                                        <CommandGroup>
                                            {categories.map(c => (
                                                <CommandItem key={c.id} value={c.name} onSelect={() => toggleCategory(c.id)}>
                                                    <div className={cn(
                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        selectedCategories.includes(c.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                    )}>
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                    {c.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                    <div className="p-2 border-t">
                                        <Button size="sm" className="w-full" onClick={() => setOpenCategory(false)}>Done</Button>
                                    </div>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleExportCsv} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        CSV
                    </Button>
                    <Button variant="secondary" onClick={handleExportExcel} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Excel
                    </Button>
                    <Button onClick={handleExportPDF} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

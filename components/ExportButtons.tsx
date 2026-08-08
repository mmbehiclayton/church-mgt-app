"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown, FileSpreadsheet } from "lucide-react";
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

    const noCategorySelected = selectedCategories.length === 0;

    function requireCategory() {
        if (noCategorySelected) {
            toast.error("Select a category first", { description: "Choose at least one category before downloading." });
            return true;
        }
        return false;
    }

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

    function fileName() {
        return `${orgLabel()} ${categoryLabel()} SUPPORT ${new Date().getFullYear()}.xlsx`;
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

    async function handleDownload() {
        if (requireCategory()) return;
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
            downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName());
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Download failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {asMenuItem ? (
                <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Download Transactions</DialogTitle>
                    <DialogDescription>
                        Choose a category and an optional date range, then download as Excel.
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
                        <Label>
                            Categories <span className="text-red-500">*</span>
                        </Label>
                        <Popover open={openCategory} onOpenChange={setOpenCategory}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between", noCategorySelected && "border-red-400")}
                                >
                                    {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : "Select a category..."}
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
                        {noCategorySelected && (
                            <p className="text-xs text-red-500">Select at least one category to download.</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleDownload} disabled={loading || noCategorySelected} className="w-full">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        {loading ? "Downloading…" : "Download Excel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

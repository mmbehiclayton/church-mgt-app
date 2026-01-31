"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
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
    CommandList
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { getTransactions } from "@/app/actions"; // Server Action

interface Category {
    id: string;
    name: string;
}

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function ExportButtons({ categories, asMenuItem = false }: { categories: Category[], asMenuItem?: boolean }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // ... (rest of logic)

    // Using same strategy as ImportButton to replace header and wrapper

    // Separate states for start and end date
    const [startDate, setStartDate] = useState<Date | undefined>(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Start of current month
    );
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());

    const [openStartDate, setOpenStartDate] = useState(false);
    const [openEndDate, setOpenEndDate] = useState(false);

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [openCategory, setOpenCategory] = useState(false);

    const toggleCategory = (id: string) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(prev => prev.filter(c => c !== id));
        } else {
            setSelectedCategories(prev => [...prev, id]);
        }
    };

    const fetchData = async () => {
        const filters = {
            startDate: startDate,
            endDate: endDate,
            categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined
        };
        // Normalize end date to end of day
        if (filters.endDate) {
            filters.endDate = new Date(filters.endDate);
            filters.endDate.setHours(23, 59, 59, 999);
        }

        return await getTransactions(filters);
    };

    const handleExportExcel = async () => {
        try {
            setLoading(true);
            const transactions = await fetchData();
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Transactions');

            // 0. Prepare Metadata
            const categoryNames = selectedCategories.length > 0
                ? categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join(", ")
                : "All Categories";

            // 1. Add Metadata Rows
            worksheet.addRow(['REGION:', 'MWIKI REGION']);
            worksheet.addRow(['BISHOPS NAME:', 'D.A.B ENG. OLWENY']);
            worksheet.addRow(["BISHOP'S NUMBER:", '0722738771']);
            worksheet.addRow(['CATEGORY:', categoryNames]);
            worksheet.addRow([]); // Empty row for spacing

            // Style Metadata keys (Column A)
            [1, 2, 3, 4].forEach(rowIdx => {
                worksheet.getCell(`A${rowIdx}`).font = { bold: true };
            });

            // 2. Define Columns (Widths only, headers added manually)
            worksheet.getColumn(1).width = 20; // Reference
            worksheet.getColumn(2).width = 15; // Amount
            worksheet.getColumn(3).width = 15; // Bank
            worksheet.getColumn(4).width = 20; // Account
            worksheet.getColumn(5).width = 15; // Date
            worksheet.getColumn(6).width = 10; // Time

            // 3. Add Table Header
            const headerRow = worksheet.addRow([
                'Reference Number',
                'Amount',
                'Bank',
                'Account Number',
                'Date',
                'Time'
            ]);

            // 4. Add Data
            const extractTimeFromMessage = (message: string) => {
                const match = message.match(/at\s+(\d{1,2}:\d{2}(?:\s?[AP]M)?)/i);
                return match ? match[1] : null;
            };

            let totalAmount = 0;

            transactions.forEach(t => {
                const dateObj = new Date(t.transactionDate);
                const extractedTime = extractTimeFromMessage(t.rawMessage);
                totalAmount += t.amount;

                worksheet.addRow([
                    t.reference,
                    t.amount,
                    t.bank || "",
                    t.account || "",
                    format(dateObj, "d/M/yyyy"),
                    extractedTime || t.transactionTime || format(dateObj, "HH:mm")
                ]);
            });

            // 5. Add Total Row
            const totalRow = worksheet.addRow([
                'TOTAL',
                totalAmount
            ]);
            totalRow.font = { bold: true };

            // 6. Styling

            // Header Style (Row 6)
            headerRow.font = { bold: true };
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC000' } // Yellowish/Orange
                };
            });

            // Borders for Table (from Header row down to Total row)
            const startRow = headerRow.number; // Should be 6
            const endRow = totalRow.number;

            for (let i = startRow; i <= endRow; i++) {
                const row = worksheet.getRow(i);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    if (colNumber <= 6) { // Only border defined columns
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                });
            }

            // Write File
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            document.body.appendChild(anchor);
            anchor.href = url;
            anchor.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);

            setOpen(false);
        } catch (error) {
            console.error("Export failed", error);
            // Optionally add toast here
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            setLoading(true);
            const transactions = await fetchData();

            const doc = new jsPDF();
            doc.text("Church Transactions Report", 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
            if (startDate && endDate) {
                doc.text(`Period: ${format(startDate, "PPP")} - ${format(endDate, "PPP")}`, 14, 34);
            }

            const tableData = transactions.map(t => [
                new Date(t.transactionDate).toLocaleDateString(),
                t.reference,
                t.category?.name || "-",
                `Ksh ${t.amount.toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Date', 'Ref', 'Category', 'Amount']],
                body: tableData,
            });

            // doc.save(`transactions_${format(new Date(), "yyyy-MM-dd")}.pdf`);
            const pdfBlob = doc.output('blob');
            const url = window.URL.createObjectURL(pdfBlob);
            const anchor = document.createElement('a');
            document.body.appendChild(anchor);
            anchor.href = url;
            anchor.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.pdf`;
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);

            setOpen(false);
        } catch (error) {
            console.error("Export failed", error);
        } finally {
            setLoading(false);
        }
    };

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
                        Filter the data you want to export. Leave categories empty to export all.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Date Fields Split */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Start Date</Label>
                            <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <div className="p-2">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            initialFocus
                                        />
                                        <div className="mt-2 flex justify-end">
                                            <Button size="sm" onClick={() => setOpenStartDate(false)}>
                                                Confirm
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label>End Date</Label>
                            <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <div className="p-2">
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            onSelect={setEndDate}
                                            initialFocus
                                        />
                                        <div className="mt-2 flex justify-end">
                                            <Button size="sm" onClick={() => setOpenEndDate(false)}>
                                                Confirm
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="grid gap-2">
                        <Label>Categories</Label>
                        <Popover open={openCategory} onOpenChange={setOpenCategory}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCategory}
                                    className="w-full justify-between"
                                >
                                    {selectedCategories.length > 0
                                        ? `${selectedCategories.length} selected`
                                        : "Select Categories"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search category..." />
                                    <CommandList>
                                        <CommandEmpty>No category found.</CommandEmpty>
                                        <CommandGroup>
                                            {categories.map((category) => (
                                                <CommandItem
                                                    key={category.id}
                                                    value={category.name}
                                                    onSelect={() => toggleCategory(category.id)}
                                                >
                                                    <div className={cn(
                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        selectedCategories.includes(category.id)
                                                            ? "bg-primary text-primary-foreground"
                                                            : "opacity-50 [&_svg]:invisible"
                                                    )}>
                                                        <Check className={cn("h-4 w-4")} />
                                                    </div>
                                                    {category.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                    <div className="p-2 border-t">
                                        <Button
                                            size="sm"
                                            className="w-full"
                                            onClick={() => setOpenCategory(false)}
                                        >
                                            Confirm Selection
                                        </Button>
                                    </div>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="secondary" onClick={handleExportExcel} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Excel
                    </Button>
                    <Button onClick={handleExportPDF} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

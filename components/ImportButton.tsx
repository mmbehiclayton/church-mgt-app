"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ExcelJS from "exceljs";
import { importTransactions } from "@/app/actions";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function ImportButton({ asMenuItem = false }: { asMenuItem?: boolean }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const { addToast } = useToast();

    // ... (rest of logic)

    // Using a simpler render strategy for the change

    // We need to return the full component logic, but I can't see the middle part in the Replace call context easily unless I include it.
    // However, I can target the component signature and Return statement.
    // But since I have to wrap the whole Dialog, I should replace large chunk.

    // Wait, the tool definition says "To edit a single contiguous block of lines". I should be careful not to replace the logic inside unless I have it.
    // I have the file content from the previous turn.

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) {
            addToast({
                title: "No file selected",
                description: "Please select an Excel file to import.",
                variant: "error",
            });
            return;
        }

        setLoading(true);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                addToast({
                    title: "Invalid file",
                    description: "No worksheet found in the Excel file.",
                    variant: "error",
                });
                setLoading(false);
                return;
            }

            const data: any[] = [];

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                const category = row.getCell(1).text;
                const reference = row.getCell(2).text;
                const amount = row.getCell(3).value;
                const bank = row.getCell(4).text;
                const account = row.getCell(5).text;

                // Handle Date - ExcelJS returns Date objects for date-formatted cells
                const dateCell = row.getCell(6);
                let date = dateCell.text;
                if (dateCell.value instanceof Date && !isNaN(dateCell.value.getTime())) {
                    date = format(dateCell.value, 'd/M/yyyy');
                }

                // Handle Time - ExcelJS returns Date objects for time-formatted cells
                const timeCell = row.getCell(7);
                let time = timeCell.text;
                if (timeCell.value instanceof Date && !isNaN(timeCell.value.getTime())) {
                    time = format(timeCell.value, 'HH:mm');
                }

                if (reference && amount) {
                    data.push({
                        category,
                        reference,
                        amount: Number(amount),
                        bank,
                        account,
                        date,
                        time
                    });
                }
            });

            if (data.length === 0) {
                addToast({
                    title: "No data found",
                    description: "No valid transactions found in the file.",
                    variant: "error",
                });
                setLoading(false);
                return;
            }

            const result = await importTransactions(data);

            if (result.error) {
                addToast({
                    title: "Import failed",
                    description: result.error,
                    variant: "error",
                    duration: 7000,
                });
            } else {
                addToast({
                    title: "Import successful!",
                    description: `Successfully imported ${result.count} transactions.`,
                    variant: "success",
                    duration: 5000,
                });
                setFile(null);
                setOpen(false);
            }
        } catch (err) {
            console.error(err);
            addToast({
                title: "Import failed",
                description: "Failed to parse Excel file. Please ensure it follows the correct format.",
                variant: "error",
                duration: 7000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {asMenuItem ? (
                <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Upload className="mr-2 h-4 w-4" /> Import
                    </DropdownMenuItem>
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" /> Import
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Transactions</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file with the following columns: Category, Reference Number, Amount, Bank, Account Number, Date (d/M/yyyy), Time.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="file">Excel File (.xlsx)</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                        />
                        {file && (
                            <p className="text-sm text-gray-500 mt-1">
                                Selected: <span className="font-medium">{file.name}</span>
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={loading || !file}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Importing..." : "Import"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

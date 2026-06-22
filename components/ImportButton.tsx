"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import ExcelJS from "exceljs";
import { importTransactions } from "@/app/actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type ParsedRow = {
    rowNum: number;
    category: string;
    reference: string;
    amount: number;
    bank: string;
    account: string;
    date: string;
    time: string;
    error: string | null;
    isDupe: boolean; // duplicate reference within the file
};

function toStr(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    return "";
}

function parseFile(worksheet: ExcelJS.Worksheet): ParsedRow[] {
    const rows: ParsedRow[] = [];
    const seenRefs = new Map<string, number>(); // ref -> first rowNum

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        const category = row.getCell(1).text.trim();
        const reference = row.getCell(2).text.trim();
        const rawAmount = row.getCell(3).value;
        const bank = toStr(row.getCell(4).value ?? row.getCell(4).text);
        const account = toStr(row.getCell(5).value ?? row.getCell(5).text);

        const dateCell = row.getCell(6);
        let date = dateCell.text;
        if (dateCell.value instanceof Date && !isNaN(dateCell.value.getTime())) {
            date = format(dateCell.value, "d/M/yyyy");
        }

        const timeCell = row.getCell(7);
        let time = timeCell.text;
        if (timeCell.value instanceof Date && !isNaN(timeCell.value.getTime())) {
            time = format(timeCell.value, "HH:mm");
        }

        const amount = typeof rawAmount === "number" ? rawAmount : Number(toStr(rawAmount));

        let error: string | null = null;
        if (!reference) error = "Missing reference";
        else if (!amount || !isFinite(amount)) error = "Invalid amount";
        else if (!date) error = "Missing date";

        const isDupe = reference ? seenRefs.has(reference) : false;
        if (reference && !seenRefs.has(reference)) seenRefs.set(reference, rowNumber);

        rows.push({ rowNum: rowNumber, category, reference, amount: isFinite(amount) ? amount : 0, bank, account, date, time, error, isDupe });
    });

    return rows;
}

export default function ImportButton({ asMenuItem = false }: { asMenuItem?: boolean }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"upload" | "preview">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);

    function reset() {
        setStep("upload");
        setFile(null);
        setParsedRows([]);
    }

    function handleOpenChange(v: boolean) {
        setOpen(v);
        if (!v) reset();
    }

    async function handleParse() {
        if (!file) return;
        setParsing(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                toast.error("Invalid file", { description: "No worksheet found in the Excel file." });
                return;
            }
            const rows = parseFile(worksheet);
            if (rows.length === 0) {
                toast.error("No data found", { description: "The file appears to be empty (no rows after the header)." });
                return;
            }
            setParsedRows(rows);
            setStep("preview");
        } catch {
            toast.error("Parse failed", { description: "Could not read the Excel file. Check the format and try again." });
        } finally {
            setParsing(false);
        }
    }

    async function handleImport() {
        const valid = parsedRows.filter(r => !r.error && !r.isDupe).map(r => ({
            category: r.category,
            reference: r.reference,
            amount: r.amount,
            bank: r.bank,
            account: r.account,
            date: r.date,
            time: r.time,
        }));

        if (valid.length === 0) {
            toast.error("Nothing to import", { description: "All rows have errors or duplicate references." });
            return;
        }

        setImporting(true);
        try {
            const result = await importTransactions(valid);
            if (result.error) {
                toast.error("Import failed", { description: result.error, duration: 7000 });
            } else {
                const skipped = valid.length - (result.count ?? 0);
                const desc = skipped > 0
                    ? `${result.count} inserted, ${skipped} skipped (already exist in DB).`
                    : `${result.count} transaction${result.count !== 1 ? "s" : ""} imported successfully.`;
                toast.success("Import complete", { description: desc, duration: 6000 });
                handleOpenChange(false);
            }
        } catch {
            toast.error("Import failed", { description: "An unexpected error occurred." });
        } finally {
            setImporting(false);
        }
    }

    const validCount = parsedRows.filter(r => !r.error && !r.isDupe).length;
    const errorCount = parsedRows.filter(r => r.error).length;
    const dupeCount = parsedRows.filter(r => !r.error && r.isDupe).length;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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

            <DialogContent className={cn("transition-all", step === "preview" ? "sm:max-w-4xl" : "sm:max-w-[500px]")}>
                {/* ── Step 1: Upload ── */}
                {step === "upload" && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Import Transactions</DialogTitle>
                            <DialogDescription>
                                Upload an Excel file with columns: Category, Reference, Amount, Bank, Account, Date (d/M/yyyy), Time.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="file">Excel File (.xlsx)</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                                />
                                {file && (
                                    <p className="text-sm text-muted-foreground">
                                        Selected: <span className="font-medium">{file.name}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={parsing}>Cancel</Button>
                            <Button onClick={handleParse} disabled={parsing || !file}>
                                {parsing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing…</> : "Preview"}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* ── Step 2: Preview ── */}
                {step === "preview" && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Preview Import</DialogTitle>
                            <DialogDescription asChild>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        {validCount} valid
                                    </Badge>
                                    {dupeCount > 0 && (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                            {dupeCount} in-file duplicate{dupeCount !== 1 ? "s" : ""} (will be skipped)
                                        </Badge>
                                    )}
                                    {errorCount > 0 && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            {errorCount} error{errorCount !== 1 ? "s" : ""}
                                        </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground self-center">({parsedRows.length} total rows)</span>
                                </div>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[55vh] overflow-auto rounded-md border border-border text-xs">
                            <table className="w-full min-w-[640px]">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                    <tr className="text-left">
                                        <th className="px-3 py-2 font-medium text-muted-foreground w-10">#</th>
                                        <th className="px-3 py-2 font-medium text-muted-foreground">Category</th>
                                        <th className="px-3 py-2 font-medium text-muted-foreground">Reference</th>
                                        <th className="px-3 py-2 font-medium text-muted-foreground text-right">Amount</th>
                                        <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                                        <th className="px-3 py-2 font-medium text-muted-foreground">Bank</th>
                                        <th className="px-3 py-2 font-medium text-muted-foreground w-36">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {parsedRows.map(r => (
                                        <tr
                                            key={r.rowNum}
                                            className={cn(
                                                r.error ? "bg-red-50 dark:bg-red-950/20" :
                                                r.isDupe ? "bg-amber-50 dark:bg-amber-950/20" :
                                                "hover:bg-muted/30"
                                            )}
                                        >
                                            <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{r.rowNum}</td>
                                            <td className="px-3 py-1.5 truncate max-w-[120px]">{r.category || "—"}</td>
                                            <td className="px-3 py-1.5 font-mono">{r.reference || "—"}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                                                {r.amount ? `Ksh ${r.amount.toLocaleString()}` : "—"}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">{r.date || "—"}</td>
                                            <td className="px-3 py-1.5">{r.bank || "—"}</td>
                                            <td className="px-3 py-1.5">
                                                {r.error ? (
                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                        <AlertCircle className="h-3 w-3 shrink-0" /> {r.error}
                                                    </span>
                                                ) : r.isDupe ? (
                                                    <span className="text-amber-600 dark:text-amber-400">Duplicate ref</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3 w-3 shrink-0" /> Valid
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setStep("upload")} disabled={importing}>
                                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                            </Button>
                            <Button onClick={handleImport} disabled={importing || validCount === 0}>
                                {importing
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</>
                                    : `Import ${validCount} row${validCount !== 1 ? "s" : ""}`}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

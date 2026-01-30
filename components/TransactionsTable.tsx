"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { deleteTransactions } from "@/app/actions";
import { useRouter } from "next/navigation";

interface Transaction {
    id: string;
    reference: string;
    amount: number;
    transactionDate: Date;
    transactionTime: string | null;
    bank: string | null;
    category: { name: string } | null;
    account: string | null;
}

export default function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(transactions.map(t => t.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(x => x !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;

        setLoading(true);
        const res = await deleteTransactions(selectedIds);
        if (res.success) {
            setSelectedIds([]);
            router.refresh();
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

    return (
        <Card>
            <CardContent className="p-0">
                {selectedIds.length > 0 && (
                    <div className="bg-muted/50 p-2 flex items-center justify-between border-b px-4">
                        <span className="text-sm font-medium">{selectedIds.length} selected</span>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={loading}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Selected
                        </Button>
                    </div>
                )}

                <div className="border-0 rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={selectedIds.length === transactions.length && transactions.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    />
                                </TableHead>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Ref</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Bank</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((t, index) => (
                                <TableRow key={t.id} className={selectedIds.includes(t.id) ? "bg-muted/50" : ""}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(t.id)}
                                            onCheckedChange={(checked) => handleSelectRow(t.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                                    <TableCell className="font-mono font-medium">{t.reference}</TableCell>
                                    <TableCell className="text-right font-medium text-emerald-600">
                                        Ksh {t.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>{t.bank || "-"}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{t.account || "-"}</TableCell>
                                    <TableCell>{format(new Date(t.transactionDate), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="text-muted-foreground">{t.transactionTime || "-"}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                            {t.category?.name || "Uncategorized"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

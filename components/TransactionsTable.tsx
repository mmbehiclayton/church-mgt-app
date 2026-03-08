"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { deleteTransactions } from "@/app/actions";
import { useRouter } from "next/navigation";
import TransactionModal from "@/components/finance/TransactionModal";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Category {
    id: string;
    name: string;
}

interface Transaction {
    id: string;
    reference: string;
    amount: number;
    transactionDate: Date;
    transactionTime: string | null;
    bank: string | null;
    category: { name: string } | null;
    categoryId: string;
    account: string | null;
    accountName: string | null;
    paybill: string | null;
    rawMessage: string;
}

export default function TransactionsTable({ transactions, categories }: { transactions: Transaction[], categories: Category[] }) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

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

    const executeBulkDelete = async () => {
        setLoading(true);
        const res = await deleteTransactions(selectedIds);
        if (res.success) {
            toast.success(`Successfully deleted ${selectedIds.length} transactions`);
            setSelectedIds([]);
            router.refresh();
        } else {
            toast.error(res.error || "Failed to delete transactions");
        }
        setLoading(false);
        setShowBulkDeleteDialog(false);
    };

    const handleBulkDelete = () => {
        setShowBulkDeleteDialog(true);
    };

    const executeDeleteSingle = async () => {
        if (!transactionToDelete) return;
        const res = await deleteTransactions([transactionToDelete]);
        if (res.success) {
            toast.success("Transaction deleted successfully");
            router.refresh();
        } else {
            toast.error(res.error || "Failed to delete transaction");
        }
        setTransactionToDelete(null);
    };

    const handleDeleteSingle = (id: string) => {
        setTransactionToDelete(id);
    };

    return (
        <Card className="border-0 shadow-none">
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
                                <TableHead className="w-[50px]"></TableHead>
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
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <TransactionModal
                                                    categories={categories}
                                                    asMenuItem
                                                    initialData={{
                                                        id: t.id,
                                                        reference: t.reference,
                                                        amount: t.amount,
                                                        transactionDate: t.transactionDate,
                                                        transactionTime: t.transactionTime,
                                                        bank: t.bank,
                                                        paybill: t.paybill,
                                                        account: t.account,
                                                        accountName: t.accountName,
                                                        rawMessage: t.rawMessage,
                                                        categoryId: t.categoryId
                                                    }}
                                                />
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDeleteSingle(t.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <ConfirmationDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
                title="Delete Transactions"
                description={`Are you sure you want to delete ${selectedIds.length} transactions? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={executeBulkDelete}
                variant="danger"
                loading={loading}
            />

            <ConfirmationDialog
                open={!!transactionToDelete}
                onOpenChange={(open) => !open && setTransactionToDelete(null)}
                title="Delete Transaction"
                description="Are you sure you want to delete this transaction? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={executeDeleteSingle}
                variant="danger"
            />
        </Card>
    );
}

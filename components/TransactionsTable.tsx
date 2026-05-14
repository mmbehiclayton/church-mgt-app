"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trash2, MoreHorizontal, User } from "lucide-react";
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
    memberId?: string | null;
    memberName?: string | null;
}

export default function TransactionsTable({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [deleteSingleId, setDeleteSingleId] = useState<string | null>(null);

    const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

    function toggleAll(checked: boolean) {
        setSelectedIds(checked ? transactions.map(t => t.id) : []);
    }

    function toggleRow(id: string, checked: boolean) {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    }

    async function executeBulkDelete() {
        setLoading(true);
        const res = await deleteTransactions(selectedIds);
        setLoading(false);
        setShowBulkDelete(false);
        if (res.success) {
            toast.success(`${selectedIds.length} transaction${selectedIds.length !== 1 ? "s" : ""} deleted`);
            setSelectedIds([]);
            router.refresh();
        } else {
            toast.error(res.error || "Failed to delete");
        }
    }

    async function executeSingleDelete() {
        if (!deleteSingleId) return;
        const res = await deleteTransactions([deleteSingleId]);
        setDeleteSingleId(null);
        if (res.success) {
            toast.success("Transaction deleted");
            router.refresh();
        } else {
            toast.error(res.error || "Failed to delete");
        }
    }

    return (
        <>
            {/* Bulk selection bar */}
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                    <span className="text-sm font-medium">{selectedIds.length} selected</span>
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)} disabled={loading}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete selected
                    </Button>
                </div>
            )}

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-10">
                                <Checkbox checked={allSelected} onCheckedChange={v => toggleAll(v as boolean)} />
                            </TableHead>
                            <TableHead className="w-8 text-xs">#</TableHead>
                            <TableHead className="text-xs">Reference</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Member</TableHead>
                            <TableHead className="text-xs hidden md:table-cell">Account</TableHead>
                            <TableHead className="text-xs hidden lg:table-cell">Bank</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((t, index) => (
                            <TableRow
                                key={t.id}
                                className={selectedIds.includes(t.id) ? "bg-primary/5" : ""}
                            >
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.includes(t.id)}
                                        onCheckedChange={v => toggleRow(t.id, v as boolean)}
                                    />
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs tabular-nums">{index + 1}</TableCell>
                                <TableCell className="font-mono text-xs font-medium">{t.reference}</TableCell>
                                <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                                    Ksh {t.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    {t.memberName ? (
                                        <span className="flex items-center gap-1.5 text-xs">
                                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="truncate max-w-[120px]">{t.memberName}</span>
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                                    {t.account || "—"}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                    {t.bank || "—"}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                    {format(new Date(t.transactionDate), "dd MMM yyyy")}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                                        {t.category?.name || "Uncategorized"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-7 w-7 p-0 text-muted-foreground">
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
                                                    categoryId: t.categoryId,
                                                    memberId: t.memberId,
                                                    memberName: t.memberName,
                                                }}
                                            />
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setDeleteSingleId(t.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}

                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <ConfirmationDialog
                open={showBulkDelete}
                onOpenChange={setShowBulkDelete}
                title="Delete transactions?"
                description={`This will permanently delete ${selectedIds.length} transaction${selectedIds.length !== 1 ? "s" : ""}. This cannot be undone.`}
                confirmText="Delete"
                onConfirm={executeBulkDelete}
                variant="danger"
                loading={loading}
            />

            <ConfirmationDialog
                open={!!deleteSingleId}
                onOpenChange={open => { if (!open) setDeleteSingleId(null); }}
                title="Delete transaction?"
                description="This will permanently delete this transaction. This cannot be undone."
                confirmText="Delete"
                onConfirm={executeSingleDelete}
                variant="danger"
            />
        </>
    );
}

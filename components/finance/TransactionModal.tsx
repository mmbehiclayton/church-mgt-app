"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Pencil } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Category {
    id: string;
    name: string;
}

// Reuse the interface or import it if shared (but for now simple duplication is fine to avoid file churn)
interface TransactionData {
    id?: string;
    reference: string;
    amount: number;
    transactionDate: Date;
    transactionTime?: string | null;
    bank?: string | null;
    paybill?: string | null;
    account?: string | null;
    accountName?: string | null;
    rawMessage: string;
    categoryId: string;
}

export default function TransactionModal({
    categories,
    asMenuItem = false,
    initialData
}: {
    categories: Category[],
    asMenuItem?: boolean,
    initialData?: TransactionData
}) {
    const [open, setOpen] = useState(false);

    const isEdit = !!initialData;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {asMenuItem ? (
                <DialogTrigger asChild>
                    <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                    >
                        {isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        <span>{isEdit ? "Edit" : "New Transaction"}</span>
                    </DropdownMenuItem>
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    {isEdit ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                    ) : (
                        <Button className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            <span className="sm:hidden">New</span>
                            <span className="hidden sm:inline">New Transaction</span>
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Transaction" : "New Transaction"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update details for this transaction." : "Paste an M-Pesa message to automatically record a transaction."}
                    </DialogDescription>
                </DialogHeader>
                <TransactionForm
                    categories={categories}
                    onSuccess={() => setOpen(false)}
                    initialData={initialData}
                />
            </DialogContent>
        </Dialog>
    );
}

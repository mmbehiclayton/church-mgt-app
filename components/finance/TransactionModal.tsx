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
import { PlusCircle } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Category {
    id: string;
    name: string;
}

export default function TransactionModal({ categories, asMenuItem = false }: { categories: Category[], asMenuItem?: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {asMenuItem ? (
                <DialogTrigger asChild>
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            // Interaction with DialogTrigger automatically handles opening, 
                            // but inside DropdownMenuItem we sometimes need to separate it or use specific event handling.
                            // The simplest way with Radix UI (which shadcn uses) is usually just wrapping the Trigger.
                            // However, putting a DialogTrigger inside a DropdownMenuItem can cause issues if not handled carefully (event propagation).
                            // A common pattern is `onSelect={(e) => e.preventDefault()}` to prevent the dropdown from closing immediately if that's undesired,
                            // or letting it close but ensuring the dialog opens.
                            // If we wrap DropdownMenuItem with DialogTrigger, it might be better. 
                            // Check existing Plan: "If true, render DropdownMenuItem trigger for the Dialog."
                            // Let's wrap the content of DropdownMenuItem or treat DropdownMenuItem AS the trigger.
                            // Actually, best practice in shadcn/radix for Dialog inside Dropdown:
                            // <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            //    <DialogTrigger asChild>...</DialogTrigger>
                            // </DropdownMenuItem> 
                            // BUT we are wrapping the whole component.
                        }}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New Transaction</span>
                    </DropdownMenuItem>
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span className="sm:hidden">New</span>
                        <span className="hidden sm:inline">New Transaction</span>
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Transaction</DialogTitle>
                    <DialogDescription>
                        Paste an M-Pesa message to automatically record a transaction.
                    </DialogDescription>
                </DialogHeader>
                <TransactionForm
                    categories={categories}
                    onSuccess={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

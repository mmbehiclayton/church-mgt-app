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
import { Settings } from "lucide-react";
import CategoriesManager from "@/components/CategoriesManager";

interface Category {
    id: string;
    name: string;
    createdAt: Date;
}

export default function CategoryModal({ initialCategories }: { initialCategories: Category[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="sm:hidden">Categories</span>
                    <span className="hidden sm:inline">Manage Categories</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>
                        Add or remove transaction categories.
                    </DialogDescription>
                </DialogHeader>
                <CategoriesManager
                    initialCategories={initialCategories}
                    onSuccess={() => setOpen(false)} // Optional: close on add? Usually not for manager.
                />
            </DialogContent>
        </Dialog>
    );
}

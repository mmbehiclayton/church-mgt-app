"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCategory, deleteCategory } from "@/app/actions";
import { Trash2 } from "lucide-react";

interface Category {
    id: string;
    name: string;
    createdAt: Date;
}

import { useRouter } from "next/navigation";

export default function CategoriesManager({ initialCategories, onSuccess }: { initialCategories: Category[], onSuccess?: () => void }) {
    const router = useRouter();
    const [categories] = useState<Category[]>(initialCategories); // Optimistic UI could be better but sticking to simple for now
    const [newCategory, setNewCategory] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setLoading(true);
        const res = await createCategory(newCategory);
        if (res.success) {
            setNewCategory("");
            // In a real app we'd re-fetch or use router.refresh(), 
            // but for simplicity let's assume the parent reloads or we reload page
            router.refresh();
            onSuccess?.();
            // We might not reload here if we are in a modal, expecting parent to update data or re-render
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        const res = await deleteCategory(id);
        if (res.success) {
            router.refresh();
            onSuccess?.();
            // Also update local state to reflect change immediately without waiting for server refresh (if this component doesn't re-mount)
            // Actually, wait, this component receives initialCategories. 
            // router.refresh() should re-run the server component -> re-pass props -> re-render this.
            // BUT, `useState(initialCategories)` only runs ONCE on mount.
            // We need a useEffect to look for prop changes or just use `useTransition`?
            // Simplest fix: forceful reload or update local state.
            window.location.reload();
        } else {
            alert(res.error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="New Category Name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <Button onClick={handleAdd} disabled={loading}>Add</Button>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {categories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">No categories yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

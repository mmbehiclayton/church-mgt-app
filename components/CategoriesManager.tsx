"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCategory, deleteCategory, editCategory, setCategoryActive } from "@/app/actions";
import { Trash2, Pencil, Check, X, Tag, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
    id: string;
    name: string;
    isActive?: boolean;
    createdAt: Date;
}

export default function CategoriesManager({ initialCategories, onSuccess }: { initialCategories: Category[], onSuccess?: () => void }) {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [newCategory, setNewCategory] = useState("");
    const [loading, setLoading] = useState(false);

    // Inline editing state
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");

    // Sync local state if server data changes
    useEffect(() => {
        setCategories(initialCategories);
    }, [initialCategories]);

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setLoading(true);
        const res = await createCategory(newCategory);
        if (res.success) {
            toast.success("Category added successfully");
            setNewCategory("");
            router.refresh();
            onSuccess?.();
            // Wait a bit and scroll to bottom of the table? Or just let user see it.
        } else {
            toast.error(res.error || "Failed to add category");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        // Optimistic delete
        setCategories(prev => prev.filter(c => c.id !== id));

        const res = await deleteCategory(id);
        if (res.success) {
            toast.success("Category deleted");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to delete category");
            // Revert on failure
            setCategories(initialCategories);
        }
    };

    const handleEditStart = (cat: Category) => {
        setEditingCategoryId(cat.id);
        setEditedName(cat.name);
    };

    const handleEditCancel = () => {
        setEditingCategoryId(null);
        setEditedName("");
    };

    const handleToggleActive = async (cat: Category) => {
        const next = !(cat.isActive ?? true);
        // Optimistic update
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: next } : c));
        const res = await setCategoryActive(cat.id, next);
        if (res.success) {
            toast.success(next ? "Category activated" : "Category set inactive");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to update status");
            setCategories(initialCategories);
        }
    };

    const handleEditSave = async (id: string) => {
        if (!editedName.trim()) {
            toast.error("Category name cannot be empty");
            return;
        }

        // Optimistic update
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editedName.trim() } : c));
        setEditingCategoryId(null);

        const res = await editCategory(id, editedName);
        if (res.success) {
            toast.success("Category updated successfully");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to update category");
            // Revert on failure
            setCategories(initialCategories);
        }
    };

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="w-5 h-5 text-blue-500" />
                    Manage Categories
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="New Category Name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    <Button onClick={handleAdd} disabled={loading || !newCategory.trim()}>
                        Add
                    </Button>
                </div>

                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold text-foreground">Name</TableHead>
                                <TableHead className="w-[90px] font-semibold text-foreground">Status</TableHead>
                                <TableHead className="w-[132px] text-right font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32">
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                                <Tag className="h-5 w-5 text-muted-foreground/50" />
                                            </div>
                                            <p className="font-medium text-foreground">No categories found</p>
                                            <p className="text-sm">Add your first category to get started.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((cat) => (
                                    <TableRow key={cat.id} className="transition-colors hover:bg-muted/50">
                                        <TableCell>
                                            {editingCategoryId === cat.id ? (
                                                <Input
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="h-8 max-w-sm focus-visible:ring-blue-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleEditSave(cat.id);
                                                        if (e.key === 'Escape') handleEditCancel();
                                                    }}
                                                />
                                            ) : (
                                                <span className={cn("font-medium", (cat.isActive ?? true) ? "text-foreground" : "text-muted-foreground")}>{cat.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {(cat.isActive ?? true) ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Active</span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Inactive</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingCategoryId === cat.id ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950/40" onClick={() => handleEditSave(cat.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleEditCancel}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-950/40"
                                                        title={(cat.isActive ?? true) ? "Set inactive" : "Activate"}
                                                        onClick={() => handleToggleActive(cat)}
                                                    >
                                                        {(cat.isActive ?? true) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/40" title="Rename" onClick={() => handleEditStart(cat)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40" title="Delete" onClick={() => handleDelete(cat.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

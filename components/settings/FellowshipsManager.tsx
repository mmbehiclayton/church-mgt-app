"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createHomeFellowship, deleteHomeFellowship, updateHomeFellowship } from "@/app/actions";
import { Trash2, Pencil, Check, X, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface Fellowship {
    id: string;
    name: string;
    leader: string | null;
    location: string | null;
    createdAt: Date;
    _count?: {
        members: number;
    };
}

export default function FellowshipsManager({ initialFellowships, onSuccess }: { initialFellowships: Fellowship[], onSuccess?: () => void }) {
    const router = useRouter();
    const [fellowships, setFellowships] = useState<Fellowship[]>(initialFellowships);
    const [newFellowshipName, setNewFellowshipName] = useState("");
    const [loading, setLoading] = useState(false);

    // Inline editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");

    // Delete dialog state
    const [toDelete, setToDelete] = useState<string | null>(null);

    useEffect(() => {
        setFellowships(initialFellowships);
    }, [initialFellowships]);

    const handleAdd = async () => {
        if (!newFellowshipName.trim()) return;
        setLoading(true);
        const res = await createHomeFellowship({ name: newFellowshipName });
        if (res.success) {
            toast.success("Home Fellowship added successfully");
            setNewFellowshipName("");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to add home fellowship");
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!toDelete) return;

        const idToDelete = toDelete;

        // Only optimistic delete if we know there are no members, or just let server confirm
        const fellowship = fellowships.find(f => f.id === idToDelete);
        if (fellowship && fellowship._count?.members && fellowship._count.members > 0) {
            toast.error("Cannot delete fellowship with assigned members");
            setToDelete(null);
            return;
        }

        setFellowships(prev => prev.filter(f => f.id !== idToDelete));
        setToDelete(null);

        const res = await deleteHomeFellowship(idToDelete);
        if (res.success) {
            toast.success("Home Fellowship deleted");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to delete home fellowship");
            setFellowships(initialFellowships);
        }
    };

    const handleEditStart = (fellowship: Fellowship) => {
        setEditingId(fellowship.id);
        setEditedName(fellowship.name);
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditedName("");
    };

    const handleEditSave = async (id: string) => {
        if (!editedName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        setFellowships(prev => prev.map(f => f.id === id ? { ...f, name: editedName.trim() } : f));
        setEditingId(null);

        const res = await updateHomeFellowship(id, { name: editedName });
        if (res.success) {
            toast.success("Home Fellowship updated successfully");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to update home fellowship");
            setFellowships(initialFellowships);
        }
    };

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Home className="w-5 h-5 text-blue-500" />
                    Manage Fellowships
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="New Fellowship Name"
                        value={newFellowshipName}
                        onChange={(e) => setNewFellowshipName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    <Button onClick={handleAdd} disabled={loading || !newFellowshipName.trim()}>
                        Add
                    </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Name</TableHead>
                                <TableHead className="font-semibold text-slate-700">Members</TableHead>
                                <TableHead className="w-[120px] text-right font-semibold text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fellowships.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32">
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                <Home className="h-5 w-5 text-slate-300" />
                                            </div>
                                            <p className="font-medium text-slate-600">No fellowships found</p>
                                            <p className="text-sm">Add your first home fellowship to get started.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fellowships.map((fellowship) => (
                                    <TableRow key={fellowship.id} className="group transition-colors hover:bg-slate-50">
                                        <TableCell>
                                            {editingId === fellowship.id ? (
                                                <Input
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="h-8 max-w-sm focus-visible:ring-blue-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleEditSave(fellowship.id);
                                                        if (e.key === 'Escape') handleEditCancel();
                                                    }}
                                                />
                                            ) : (
                                                <span className="font-medium text-slate-700">{fellowship.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                {fellowship._count?.members || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingId === fellowship.id ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleEditSave(fellowship.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-200" onClick={handleEditCancel}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditStart(fellowship)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setToDelete(fellowship.id)}>
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

            <ConfirmationDialog
                open={!!toDelete}
                onOpenChange={(open) => !open && setToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Fellowship"
                description="Are you sure you want to delete this home fellowship? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </Card>
    );
}

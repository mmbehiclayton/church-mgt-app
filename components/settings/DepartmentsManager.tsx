"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createDepartment, deleteDepartment, updateDepartment } from "@/app/actions";
import { Trash2, Pencil, Check, X, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface Department {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    _count?: {
        members: number;
    };
}

export default function DepartmentsManager({ initialDepartments, onSuccess }: { initialDepartments: Department[], onSuccess?: () => void }) {
    const router = useRouter();
    const [departments, setDepartments] = useState<Department[]>(initialDepartments);
    const [newDepartmentName, setNewDepartmentName] = useState("");
    const [loading, setLoading] = useState(false);

    // Inline editing state
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");

    // Delete dialog state
    const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

    // Sync local state if server data changes
    useEffect(() => {
        setDepartments(initialDepartments);
    }, [initialDepartments]);

    const handleAdd = async () => {
        if (!newDepartmentName.trim()) return;
        setLoading(true);
        const res = await createDepartment({ name: newDepartmentName });
        if (res.success) {
            toast.success("Department added successfully");
            setNewDepartmentName("");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to add department");
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!deptToDelete) return;

        // Optimistic delete
        const idToDelete = deptToDelete;
        setDepartments(prev => prev.filter(d => d.id !== idToDelete));
        setDeptToDelete(null);

        const res = await deleteDepartment(idToDelete);
        if (res.success) {
            toast.success("Department deleted");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to delete department");
            // Revert on failure
            setDepartments(initialDepartments);
        }
    };

    const handleEditStart = (dept: Department) => {
        setEditingDeptId(dept.id);
        setEditedName(dept.name);
    };

    const handleEditCancel = () => {
        setEditingDeptId(null);
        setEditedName("");
    };

    const handleEditSave = async (id: string) => {
        if (!editedName.trim()) {
            toast.error("Department name cannot be empty");
            return;
        }

        // Optimistic update
        setDepartments(prev => prev.map(d => d.id === id ? { ...d, name: editedName.trim() } : d));
        setEditingDeptId(null);

        const res = await updateDepartment(id, { name: editedName });
        if (res.success) {
            toast.success("Department updated successfully");
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to update department");
            // Revert on failure
            setDepartments(initialDepartments);
        }
    };

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Manage Departments
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="New Department Name"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    <Button onClick={handleAdd} disabled={loading || !newDepartmentName.trim()}>
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
                            {departments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32">
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                <Layers className="h-5 w-5 text-slate-300" />
                                            </div>
                                            <p className="font-medium text-slate-600">No departments found</p>
                                            <p className="text-sm">Add your first department to get started.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                departments.map((dept) => (
                                    <TableRow key={dept.id} className="group transition-colors hover:bg-slate-50">
                                        <TableCell>
                                            {editingDeptId === dept.id ? (
                                                <Input
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="h-8 max-w-sm focus-visible:ring-blue-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleEditSave(dept.id);
                                                        if (e.key === 'Escape') handleEditCancel();
                                                    }}
                                                />
                                            ) : (
                                                <span className="font-medium text-slate-700">{dept.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                {dept._count?.members || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingDeptId === dept.id ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleEditSave(dept.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-200" onClick={handleEditCancel}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditStart(dept)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeptToDelete(dept.id)}>
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
                open={!!deptToDelete}
                onOpenChange={(open) => !open && setDeptToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Department"
                description="Are you sure you want to delete this department? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </Card>
    );
}

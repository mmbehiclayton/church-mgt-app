"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Users, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import {
    createAccountabilityGroup,
    updateAccountabilityGroup,
    deleteAccountabilityGroup,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface Group {
    id: string;
    name: string;
    leader: string | null;
    description: string | null;
    _count: { members: number };
}

interface Props {
    open: boolean;
    onClose: () => void;
    groups: Group[];
}

const emptyForm = { name: "", leader: "", description: "" };

export default function ManageAccountabilityGroupsModal({ open, onClose, groups }: Props) {
    const router = useRouter();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingName, setDeletingName] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    function startAdd() {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
    }

    function startEdit(g: Group) {
        setEditingId(g.id);
        setForm({ name: g.name, leader: g.leader ?? "", description: g.description ?? "" });
        setShowForm(true);
    }

    function cancelForm() {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const result = editingId
            ? await updateAccountabilityGroup(editingId, { name: form.name, leader: form.leader || undefined, description: form.description || undefined })
            : await createAccountabilityGroup({ name: form.name, leader: form.leader || undefined, description: form.description || undefined });
        setLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(editingId ? "Group updated" : "Group created");
            router.refresh();
            cancelForm();
        }
    }

    async function handleDelete() {
        if (!deletingId) return;
        setDeleting(true);
        const result = await deleteAccountabilityGroup(deletingId);
        setDeleting(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Group deleted");
            router.refresh();
        }
        setDeletingId(null);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => { if (!v) { cancelForm(); onClose(); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            Accountability Groups
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto pr-1">
                        {/* Existing groups */}
                        {groups.length === 0 && !showForm && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No groups yet. Create the first one.
                            </p>
                        )}
                        {groups.map(g => (
                            <div key={g.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{g.name}</span>
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                            {g._count.members} member{g._count.members !== 1 ? "s" : ""}
                                        </Badge>
                                    </div>
                                    {g.leader && <p className="text-xs text-muted-foreground mt-0.5">Leader: {g.leader}</p>}
                                    {g.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.description}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(g)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => { setDeletingId(g.id); setDeletingName(g.name); }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Inline form */}
                        {showForm && (
                            <form onSubmit={handleSubmit} className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
                                <p className="text-sm font-medium">{editingId ? "Edit Group" : "New Group"}</p>
                                <div className="space-y-1">
                                    <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Eagles, Champions, Arrows"
                                        className="h-9"
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Leader (optional)</Label>
                                    <Input
                                        value={form.leader}
                                        onChange={e => setForm({ ...form, leader: e.target.value })}
                                        placeholder="Leader name"
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Description (optional)</Label>
                                    <Input
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Short description"
                                        className="h-9"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button type="button" variant="outline" size="sm" onClick={cancelForm} disabled={loading}>Cancel</Button>
                                    <Button type="submit" size="sm" disabled={loading || !form.name.trim()}>
                                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                        {editingId ? "Save Changes" : "Create Group"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>

                    <DialogFooter className="flex-row items-center justify-between gap-2">
                        {!showForm && (
                            <Button variant="outline" size="sm" onClick={startAdd}>
                                <Plus className="h-4 w-4 mr-1.5" /> New Group
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { cancelForm(); onClose(); }} className="ml-auto">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={!!deletingId}
                onOpenChange={(v) => { if (!v) setDeletingId(null); }}
                title="Delete Group"
                description={`Delete "${deletingName}"? Members assigned to it will have their section cleared.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                variant="danger"
                loading={deleting}
            />
        </>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
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
import { Users, Pencil, Trash2, Plus, Loader2, X, Search } from "lucide-react";
import {
    createAccountabilityGroup,
    updateAccountabilityGroup,
    deleteAccountabilityGroup,
    searchMembers,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface Leader {
    member: { id: string; fullName: string; phoneNumber: string };
}

interface Group {
    id: string;
    name: string;
    description: string | null;
    leaders: Leader[];
    _count: { members: number };
}

interface SelectedMember {
    id: string;
    fullName: string;
    phoneNumber: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    groups: Group[];
}

const emptyForm = { name: "", description: "" };

export default function ManageAccountabilityGroupsModal({ open, onClose, groups }: Props) {
    const router = useRouter();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingName, setDeletingName] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selectedLeaders, setSelectedLeaders] = useState<SelectedMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Member search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SelectedMember[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        searchTimer.current = setTimeout(async () => {
            setSearching(true);
            const results = await searchMembers(searchQuery);
            setSearchResults(results.filter(r => !selectedLeaders.some(l => l.id === r.id)));
            setSearching(false);
        }, 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [searchQuery, selectedLeaders]);

    function startAdd() {
        setEditingId(null);
        setForm(emptyForm);
        setSelectedLeaders([]);
        setSearchQuery("");
        setSearchResults([]);
        setShowForm(true);
    }

    function startEdit(g: Group) {
        setEditingId(g.id);
        setForm({ name: g.name, description: g.description ?? "" });
        setSelectedLeaders(g.leaders.map(l => l.member));
        setSearchQuery("");
        setSearchResults([]);
        setShowForm(true);
    }

    function cancelForm() {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setSelectedLeaders([]);
        setSearchQuery("");
        setSearchResults([]);
    }

    function addLeader(member: SelectedMember) {
        setSelectedLeaders(prev => prev.some(l => l.id === member.id) ? prev : [...prev, member]);
        setSearchQuery("");
        setSearchResults([]);
    }

    function removeLeader(id: string) {
        setSelectedLeaders(prev => prev.filter(l => l.id !== id));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const leaderIds = selectedLeaders.map(l => l.id);
        const result = editingId
            ? await updateAccountabilityGroup(editingId, { name: form.name, leaderIds, description: form.description || undefined })
            : await createAccountabilityGroup({ name: form.name, leaderIds, description: form.description || undefined });
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
            <Dialog open={open} onOpenChange={v => { if (!v) { cancelForm(); onClose(); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            Accountability Groups
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-1 max-h-[62vh] overflow-y-auto pr-1">
                        {/* Existing groups list */}
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
                                    {g.leaders.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {g.leaders.length === 1 ? "Leader" : "Leaders"}: {g.leaders.map(l => l.member.fullName).join(", ")}
                                        </p>
                                    )}
                                    {g.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(g)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => { setDeletingId(g.id); setDeletingName(g.name); }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Inline create/edit form */}
                        {showForm && (
                            <form onSubmit={handleSubmit} className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
                                <p className="text-sm font-medium">{editingId ? "Edit Group" : "New Group"}</p>

                                {/* Name */}
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

                                {/* Leader picker */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Leaders (optional)</Label>

                                    {/* Selected leaders chips */}
                                    {selectedLeaders.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                                            {selectedLeaders.map(l => (
                                                <span key={l.id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                    {l.fullName}
                                                    <button type="button" onClick={() => removeLeader(l.id)}
                                                        className="ml-0.5 hover:text-red-500 transition-colors">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search input */}
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                        <Input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search members by name or phone…"
                                            className="h-9 pl-8 text-sm"
                                        />
                                        {searching && (
                                            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Search results dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="rounded-md border border-border bg-popover shadow-md divide-y divide-border max-h-40 overflow-y-auto">
                                            {searchResults.map(m => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => addLeader(m)}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                                                >
                                                    <span className="font-medium">{m.fullName}</span>
                                                    <span className="text-xs text-muted-foreground">{m.phoneNumber}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchQuery.trim() && !searching && searchResults.length === 0 && (
                                        <p className="text-xs text-muted-foreground px-1">No members found for &quot;{searchQuery}&quot;</p>
                                    )}
                                </div>

                                {/* Description */}
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
                                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
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
                onOpenChange={v => { if (!v) setDeletingId(null); }}
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

"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    UserPlus, Pencil, Trash2, User, Building2, Layers,
    Search, ChevronLeft, ChevronRight, Upload,
    MoreHorizontal, X, Pencil as PencilIcon, CheckCheck, Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import AddMemberModal from "@/components/membership/AddMemberModal";
import EditMemberModal from "@/components/membership/EditMemberModal";
import DeleteMemberDialog from "@/components/membership/DeleteMemberDialog";
import ExportMembersButton from "@/components/membership/ExportMembersButton";
import AddDepartmentModal from "@/components/membership/AddDepartmentModal";
import AddHomeFellowshipModal from "@/components/membership/AddHomeFellowshipModal";
import ManageAccountabilityGroupsModal from "@/components/membership/ManageAccountabilityGroupsModal";
import { deleteMembers, getMembers, bulkUpdateMembers } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import BulkUploadModal from "@/components/membership/BulkUploadModal";
import { cn } from "@/lib/utils";

interface Department {
    id: string;
    name: string;
    description: string | null;
    _count: { members: number };
}

interface HomeFellowship {
    id: string;
    name: string;
}

interface AccountabilityGroup {
    id: string;
    name: string;
    leader: string | null;
    description: string | null;
    _count: { members: number };
}

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    estate: string | null;
    status: string | null;
    dateJoined: Date | string | null;
    homeFellowshipId: string | null;
    homeFellowship: HomeFellowship | null;
    accountabilityGroupId: string | null;
    accountabilityGroup: { id: string; name: string } | null;
    departments: { department: { id: string; name: string } }[];
}

interface MembersTableProps {
    members: Member[];
    departments: Department[];
    homeFellowships: HomeFellowship[];
    accountabilityGroups: AccountabilityGroup[];
    pagination?: { total: number; page: number; limit: number; pages: number };
}

const GENDER_ALL = "__all__";
const DEPT_ALL = "__all__";
const FELLOWSHIP_ALL = "__all__";
const GROUP_ALL = "__all__";
const STATUS_ALL = "__all__";

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    Visitor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Inactive: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function MembersTable({
    members: initialMembers,
    departments,
    homeFellowships,
    accountabilityGroups,
    pagination: initialPagination,
}: MembersTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [filterDepartment, setFilterDepartment] = useState(DEPT_ALL);
    const [filterFellowship, setFilterFellowship] = useState(FELLOWSHIP_ALL);
    const [filterGender, setFilterGender] = useState(GENDER_ALL);
    const [filterGroup, setFilterGroup] = useState(GROUP_ALL);
    const [filterStatus, setFilterStatus] = useState(STATUS_ALL);

    const [members, setMembers] = useState<Member[]>(initialMembers);
    const [pagination, setPagination] = useState(
        initialPagination ?? { total: 0, page: 1, limit: 50, pages: 0 }
    );

    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
    const [showAddHomeFellowshipModal, setShowAddHomeFellowshipModal] = useState(false);
    const [showManageGroupsModal, setShowManageGroupsModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [deletingMember, setDeletingMember] = useState<Member | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkEditType, setBulkEditType] = useState<"gender" | "fellowship" | "department" | "accountabilityGroup" | "status" | "">("");
    const [bulkEditValue, setBulkEditValue] = useState("");
    const [bulkEditMode, setBulkEditMode] = useState<"add" | "replace">("add");
    const [bulkUpdating, setBulkUpdating] = useState(false);

    const fetchMembers = useCallback(
        (search: string, dept: string, fellowship: string, gender: string, group: string, status: string, page: number) => {
            startTransition(async () => {
                const result = await getMembers({
                    search: search || undefined,
                    departmentId: dept !== DEPT_ALL ? dept : undefined,
                    fellowshipId: fellowship !== FELLOWSHIP_ALL ? fellowship : undefined,
                    gender: gender !== GENDER_ALL ? gender : undefined,
                    accountabilityGroupId: group !== GROUP_ALL ? group : undefined,
                    status: status !== STATUS_ALL ? status : undefined,
                    page,
                    limit: 50,
                });
                setMembers(result.data as Member[]);
                setPagination(result.pagination);
            });
        },
        []
    );

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchInput]);

    useEffect(() => {
        fetchMembers(debouncedSearch, filterDepartment, filterFellowship, filterGender, filterGroup, filterStatus, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, filterDepartment, filterFellowship, filterGender, filterGroup, filterStatus]);

    const handlePageChange = (newPage: number) => {
        fetchMembers(debouncedSearch, filterDepartment, filterFellowship, filterGender, filterGroup, filterStatus, newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const hasActiveFilters =
        filterDepartment !== DEPT_ALL || filterFellowship !== FELLOWSHIP_ALL ||
        filterGender !== GENDER_ALL || filterGroup !== GROUP_ALL || filterStatus !== STATUS_ALL;

    const clearFilters = () => {
        setSearchInput("");
        setFilterDepartment(DEPT_ALL);
        setFilterFellowship(FELLOWSHIP_ALL);
        setFilterGender(GENDER_ALL);
        setFilterGroup(GROUP_ALL);
        setFilterStatus(STATUS_ALL);
    };

    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? members.map(m => m.id) : []);
    const handleSelectRow = (id: string, checked: boolean) =>
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));

    const handleBulkEdit = async () => {
        if (!bulkEditType || !bulkEditValue) { toast.error("Select a field and value"); return; }
        setBulkUpdating(true);
        const result = await bulkUpdateMembers(selectedIds, {
            type: bulkEditType as "gender" | "fellowship" | "department" | "accountabilityGroup" | "status",
            value: bulkEditValue,
            mode: bulkEditMode,
        });
        setBulkUpdating(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Updated ${result.count} member${result.count !== 1 ? "s" : ""}`);
            setShowBulkEdit(false);
            setBulkEditType("");
            setBulkEditValue("");
            setSelectedIds([]);
            fetchMembers(debouncedSearch, filterDepartment, filterFellowship, filterGender, filterGroup, filterStatus, pagination.page);
        }
    };

    const executeBulkDelete = async () => {
        setBulkDeleting(true);
        const result = await deleteMembers(selectedIds);
        if (result.error) {
            toast.error("Error", { description: result.error });
        } else {
            toast.success("Success", { description: `Deleted ${selectedIds.length} member(s)` });
            setSelectedIds([]);
        }
        setBulkDeleting(false);
        setShowBulkDeleteDialog(false);
        router.refresh();
    };

    const activeFilterCount = [
        filterDepartment !== DEPT_ALL,
        filterFellowship !== FELLOWSHIP_ALL,
        filterGender !== GENDER_ALL,
        filterGroup !== GROUP_ALL,
        filterStatus !== STATUS_ALL,
    ].filter(Boolean).length;

    return (
        <>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                {/* ── Toolbar ── */}
                <div className="px-5 py-4 border-b border-border space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                            {pagination.total} member{pagination.total !== 1 ? "s" : ""}
                            {selectedIds.length > 0 && (
                                <span className="ml-2 text-muted-foreground font-normal">· {selectedIds.length} selected</span>
                            )}
                        </p>

                        <div className="flex items-center gap-2">
                            {selectedIds.length > 0 && (
                                <>
                                    <Button onClick={() => setShowBulkEdit(true)} variant="outline" size="sm">
                                        <PencilIcon className="h-4 w-4 mr-1.5" /> Edit {selectedIds.length}
                                    </Button>
                                    <Button onClick={() => setShowBulkDeleteDialog(true)} disabled={bulkDeleting} variant="destructive" size="sm">
                                        <Trash2 className="h-4 w-4 mr-1.5" /> Delete {selectedIds.length}
                                    </Button>
                                </>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MoreHorizontal className="h-4 w-4 mr-1.5" /> More
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Manage</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowAddDepartmentModal(true)}>
                                        <Layers className="mr-2 h-4 w-4" /> Add Department
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowAddHomeFellowshipModal(true)}>
                                        <Building2 className="mr-2 h-4 w-4" /> Add Fellowship
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowManageGroupsModal(true)}>
                                        <Users className="mr-2 h-4 w-4" /> Manage Sections (AGs)
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowUploadModal(true)}>
                                        <Upload className="mr-2 h-4 w-4" /> Import Members
                                    </DropdownMenuItem>
                                    <ExportMembersButton
                                        members={members}
                                        departments={departments}
                                        homeFellowships={homeFellowships}
                                        accountabilityGroups={accountabilityGroups}
                                        asMenuItem={true}
                                    />
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button onClick={() => setShowAddModal(true)} size="sm">
                                <UserPlus className="h-4 w-4 mr-1.5" /> Add Member
                            </Button>
                        </div>
                    </div>

                    {/* Filters row */}
                    <div className="flex flex-wrap gap-2">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search name, phone, estate…"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="pl-9 h-9"
                            />
                            {searchInput && (
                                <button onClick={() => setSearchInput("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={STATUS_ALL}>All Statuses</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Visitor">Visitor</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterGroup} onValueChange={setFilterGroup}>
                            <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Section" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={GROUP_ALL}>All Sections</SelectItem>
                                {accountabilityGroups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                            <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="Department" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={DEPT_ALL}>All Departments</SelectItem>
                                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterFellowship} onValueChange={setFilterFellowship}>
                            <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="Fellowship" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={FELLOWSHIP_ALL}>All Fellowships</SelectItem>
                                {homeFellowships.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterGender} onValueChange={setFilterGender}>
                            <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue placeholder="Gender" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={GENDER_ALL}>All Genders</SelectItem>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                        </Select>

                        {(hasActiveFilters || searchInput) && (
                            <button onClick={clearFilters}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-border">
                                <X className="h-3.5 w-3.5" /> Clear
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{activeFilterCount}</Badge>
                                )}
                            </button>
                        )}

                        {isPending && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-center ml-1">
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                Searching…
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-4 py-3 w-10">
                                    <Checkbox
                                        checked={members.length > 0 && selectedIds.length === members.length}
                                        onCheckedChange={c => handleSelectAll(c as boolean)}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Section</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fellowship</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Estate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {members.map((member, index) => (
                                <tr key={member.id} className={cn("transition-colors hover:bg-muted/30", selectedIds.includes(member.id) && "bg-primary/5")}>
                                    <td className="px-4 py-2.5">
                                        <Checkbox checked={selectedIds.includes(member.id)} onCheckedChange={c => handleSelectRow(member.id, c as boolean)} />
                                    </td>
                                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                                        {(pagination.page - 1) * pagination.limit + index + 1}
                                    </td>
                                    <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{member.fullName}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{member.phoneNumber}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                            member.gender === "Male"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                : "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                                        )}>
                                            {member.gender}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                            STATUS_STYLES[member.status ?? "Active"] ?? STATUS_STYLES.Active
                                        )}>
                                            {member.status ?? "Active"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                                        {member.accountabilityGroup?.name ?? <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        {member.departments.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {member.departments.map(({ department }) => (
                                                    <span key={department.id}
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        {department.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                                        {member.homeFellowship?.name ?? <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground hidden xl:table-cell">
                                        {member.estate ?? <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingMember(member)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setDeletingMember(member)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {members.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <User className="h-10 w-10 text-muted-foreground/30" />
                                            <p className="text-sm font-medium">No members found</p>
                                            <p className="text-xs">
                                                {hasActiveFilters || searchInput ? "Try adjusting your search or filters" : "Get started by adding your first member"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.pages > 1 && (
                    <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Page {pagination.page} of {pagination.pages} · {pagination.total} members
                        </p>
                        <div className="flex gap-2">
                            <Button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1 || isPending} variant="outline" size="sm">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages || isPending} variant="outline" size="sm">
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {showAddModal && (
                <AddMemberModal open={showAddModal} onClose={() => setShowAddModal(false)}
                    departments={departments} homeFellowships={homeFellowships} accountabilityGroups={accountabilityGroups} />
            )}

            {showAddHomeFellowshipModal && (
                <AddHomeFellowshipModal open={showAddHomeFellowshipModal} onClose={() => setShowAddHomeFellowshipModal(false)} members={members} />
            )}

            {showAddDepartmentModal && (
                <AddDepartmentModal open={showAddDepartmentModal} onClose={() => setShowAddDepartmentModal(false)} />
            )}

            <ManageAccountabilityGroupsModal
                open={showManageGroupsModal}
                onClose={() => setShowManageGroupsModal(false)}
                groups={accountabilityGroups}
            />

            {editingMember && (
                <EditMemberModal
                    member={editingMember}
                    open={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    departments={departments}
                    homeFellowships={homeFellowships}
                    accountabilityGroups={accountabilityGroups}
                />
            )}

            {deletingMember && (
                <DeleteMemberDialog member={deletingMember} open={!!deletingMember} onClose={() => setDeletingMember(null)} />
            )}

            <ConfirmationDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
                title="Delete Members"
                description={`Are you sure you want to delete ${selectedIds.length} member(s)? This cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={executeBulkDelete}
                variant="danger"
                loading={bulkDeleting}
            />

            {showUploadModal && (
                <BulkUploadModal open={showUploadModal} onClose={() => setShowUploadModal(false)} />
            )}

            {/* ── Bulk Edit Dialog ── */}
            <Dialog open={showBulkEdit} onOpenChange={v => { if (!v) { setShowBulkEdit(false); setBulkEditType(""); setBulkEditValue(""); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit {selectedIds.length} Member{selectedIds.length !== 1 ? "s" : ""}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Field to update</Label>
                            <Select value={bulkEditType} onValueChange={v => { setBulkEditType(v as typeof bulkEditType); setBulkEditValue(""); }}>
                                <SelectTrigger><SelectValue placeholder="Choose a field…" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="gender">Gender</SelectItem>
                                    <SelectItem value="accountabilityGroup">Section (Accountability Group)</SelectItem>
                                    <SelectItem value="fellowship">Home Fellowship</SelectItem>
                                    <SelectItem value="department">Department</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {bulkEditType === "status" && (
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                                    <SelectTrigger><SelectValue placeholder="Select status…" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Visitor">Visitor</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {bulkEditType === "gender" && (
                            <div className="space-y-1.5">
                                <Label>Gender</Label>
                                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                                    <SelectTrigger><SelectValue placeholder="Select gender…" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {bulkEditType === "accountabilityGroup" && (
                            <div className="space-y-1.5">
                                <Label>Section (Accountability Group)</Label>
                                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                                    <SelectTrigger><SelectValue placeholder="Select group…" /></SelectTrigger>
                                    <SelectContent>
                                        {accountabilityGroups.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {bulkEditType === "fellowship" && (
                            <div className="space-y-1.5">
                                <Label>Home Fellowship</Label>
                                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                                    <SelectTrigger><SelectValue placeholder="Select fellowship…" /></SelectTrigger>
                                    <SelectContent>
                                        {homeFellowships.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {bulkEditType === "department" && (
                            <>
                                <div className="space-y-1.5">
                                    <Label>Department</Label>
                                    <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                                        <SelectTrigger><SelectValue placeholder="Select department…" /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Assignment mode</Label>
                                    <div className="flex gap-2">
                                        {(["add", "replace"] as const).map(mode => (
                                            <button key={mode} type="button" onClick={() => setBulkEditMode(mode)}
                                                className={cn(
                                                    "flex-1 rounded-md border px-3 py-2 text-sm text-left transition-colors",
                                                    bulkEditMode === mode ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/40"
                                                )}>
                                                <span className="font-medium block capitalize">{mode}</span>
                                                <span className="text-xs opacity-70">
                                                    {mode === "add" ? "Keep existing departments" : "Remove all existing first"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowBulkEdit(false); setBulkEditType(""); setBulkEditValue(""); }} disabled={bulkUpdating}>
                            Cancel
                        </Button>
                        <Button onClick={handleBulkEdit} disabled={bulkUpdating || !bulkEditType || !bulkEditValue}>
                            {bulkUpdating ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    Updating…
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCheck className="h-4 w-4" /> Apply to {selectedIds.length}
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, Trash2, KeyRound, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import ResetPasswordModal from "./ResetPasswordModal";
import DeleteUserDialog from "./DeleteUserDialog";
import { formatDistanceToNow } from "date-fns";
import { deleteUser, getCurrentUserId } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { UserManagementUser } from "@/types/users";
import { cn } from "@/lib/utils";

interface UsersTableProps {
    users: UserManagementUser[];
}

export default function UsersTable({ users }: UsersTableProps) {
    const router = useRouter();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserManagementUser | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<UserManagementUser | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserManagementUser | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? users.map(u => u.id) : []);
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    };

    const executeBulkDelete = async () => {
        setBulkDeleting(true);
        const currentUserId = await getCurrentUserId();
        if (!currentUserId) {
            toast.error("Unable to verify current user");
            setBulkDeleting(false);
            setShowBulkDeleteDialog(false);
            return;
        }
        let successCount = 0, errorCount = 0;
        for (const userId of selectedIds) {
            const result = await deleteUser(userId, currentUserId);
            result.error ? errorCount++ : successCount++;
        }
        setBulkDeleting(false);
        setShowBulkDeleteDialog(false);
        setSelectedIds([]);
        if (successCount > 0) toast.success(`Deleted ${successCount} user(s)`);
        if (errorCount > 0) toast.error(`Failed to delete ${errorCount} user(s)`);
        router.refresh();
    };

    const getRoleBadge = (roleName: string) => {
        const n = roleName.toUpperCase();
        if (n === "SUPER ADMIN") return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
        if (n === "ADMIN") return "bg-primary/10 text-primary dark:bg-primary/20";
        return "bg-muted text-muted-foreground";
    };

    const getAvatarColor = (name: string | null, email: string) => {
        const colors = [
            "bg-blue-500", "bg-emerald-500", "bg-violet-500",
            "bg-pink-500", "bg-amber-500", "bg-cyan-500",
        ];
        return colors[(name || email).charCodeAt(0) % colors.length];
    };

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            const parts = name.split(" ");
            return parts.length >= 2
                ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                : name.substring(0, 2).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    return (
        <>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                        {users.length} user{users.length !== 1 ? "s" : ""}
                        {selectedIds.length > 0 && (
                            <span className="ml-2 font-normal text-muted-foreground">· {selectedIds.length} selected</span>
                        )}
                    </p>
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button onClick={() => setShowBulkDeleteDialog(true)} disabled={bulkDeleting} variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1.5" />
                                Delete {selectedIds.length}
                            </Button>
                        )}
                        <Button onClick={() => setShowAddModal(true)} size="sm">
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            Add User
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-4 py-3 w-10">
                                    <Checkbox
                                        checked={users.length > 0 && selectedIds.length === users.length}
                                        onCheckedChange={(c) => handleSelectAll(c as boolean)}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Last Login</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user, index) => (
                                <tr key={user.id} className={cn(
                                    "transition-colors hover:bg-muted/20",
                                    selectedIds.includes(user.id) && "bg-primary/5"
                                )}>
                                    <td className="px-4 py-3">
                                        <Checkbox
                                            checked={selectedIds.includes(user.id)}
                                            onCheckedChange={(c) => handleSelectRow(user.id, c as boolean)}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{index + 1}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0", getAvatarColor(user.name, user.email))}>
                                                {getInitials(user.name, user.email)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{user.name || "No Name"}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {user.userRoles.length > 0 ? (
                                                user.userRoles.map((ur) => (
                                                    <span key={ur.role.id} className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", getRoleBadge(ur.role.name))}>
                                                        {ur.role.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", getRoleBadge(user.role))}>
                                                    {user.role}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                            user.isActive
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                        )}>
                                            {user.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden md:table-cell">
                                        {user.lastLogin
                                            ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                                            : "Never"}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" title="Edit">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setResetPasswordUser(user)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500" title="Reset password">
                                                <KeyRound className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setDeletingUser(user)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Delete">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <User className="h-10 w-10 opacity-30" />
                                            <p className="text-sm font-medium">No users found</p>
                                            <p className="text-xs">Get started by adding a new user</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && <AddUserModal open={showAddModal} onClose={() => setShowAddModal(false)} />}
            {editingUser && <EditUserModal user={editingUser} open={!!editingUser} onClose={() => setEditingUser(null)} />}
            {resetPasswordUser && <ResetPasswordModal user={resetPasswordUser} open={!!resetPasswordUser} onClose={() => setResetPasswordUser(null)} />}
            {deletingUser && <DeleteUserDialog user={deletingUser} open={!!deletingUser} onClose={() => setDeletingUser(null)} />}

            <ConfirmationDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
                title="Delete Users"
                description={`Are you sure you want to delete ${selectedIds.length} user(s)? This cannot be undone.`}
                confirmText="Delete" cancelText="Cancel"
                onConfirm={executeBulkDelete}
                variant="danger" loading={bulkDeleting}
            />
        </>
    );
}

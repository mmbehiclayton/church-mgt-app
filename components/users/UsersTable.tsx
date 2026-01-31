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
import { useToast } from "@/components/ui/toast";

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
}

interface UsersTableProps {
    users: User[];
}

export default function UsersTable({ users }: UsersTableProps) {
    const router = useRouter();
    const { addToast } = useToast();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(users.map(u => u.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(x => x !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} user(s)?`)) return;

        setBulkDeleting(true);
        const currentUserId = await getCurrentUserId();

        if (!currentUserId) {
            addToast({
                title: "Error",
                description: "Unable to verify current user",
                variant: "error"
            });
            setBulkDeleting(false);
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const userId of selectedIds) {
            const result = await deleteUser(userId, currentUserId);
            if (result.error) {
                errorCount++;
            } else {
                successCount++;
            }
        }

        setBulkDeleting(false);
        setSelectedIds([]);

        if (successCount > 0) {
            addToast({
                title: "Success",
                description: `Deleted ${successCount} user(s)`,
                variant: "success"
            });
        }

        if (errorCount > 0) {
            addToast({
                title: "Warning",
                description: `Failed to delete ${errorCount} user(s)`,
                variant: "error"
            });
        }

        router.refresh();
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role.toUpperCase()) {
            case "ADMIN":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "VIEWER":
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusBadgeColor = (isActive: boolean) => {
        return isActive
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-red-100 text-red-800 border-red-200";
    };

    // Generate avatar color based on user name/email
    const getAvatarColor = (name: string | null, email: string) => {
        const str = name || email;
        const colors = [
            "bg-blue-500",
            "bg-green-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-indigo-500",
            "bg-yellow-500",
            "bg-red-500",
            "bg-teal-500",
        ];
        const index = str.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Get initials from name or email
    const getInitials = (name: string | null, email: string) => {
        if (name) {
            const parts = name.split(" ");
            if (parts.length >= 2) {
                return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                            {selectedIds.length > 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedIds.length} user(s) selected
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <Button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting}
                                    variant="destructive"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Selected
                                </Button>
                            )}
                            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Add User
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <Checkbox
                                        checked={selectedIds.length === users.length && users.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user, index) => (
                                <tr
                                    key={user.id}
                                    className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(user.id) ? "bg-blue-50" : ""
                                        }`}
                                >
                                    <td className="px-6 py-4">
                                        <Checkbox
                                            checked={selectedIds.includes(user.id)}
                                            onCheckedChange={(checked) => handleSelectRow(user.id, checked as boolean)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.name, user.email)} flex items-center justify-center text-white font-semibold`}>
                                                {getInitials(user.name, user.email)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.name || "No Name"}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(user.isActive)}`}>
                                            {user.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.lastLogin
                                            ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                                            : "Never"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingUser(user)}
                                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setResetPasswordUser(user)}
                                                className="text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingUser(user)}
                                                className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <User className="h-12 w-12 mb-2 text-gray-400" />
                                            <p className="text-sm font-medium">No users found</p>
                                            <p className="text-xs mt-1">Get started by adding a new user</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <AddUserModal open={showAddModal} onClose={() => setShowAddModal(false)} />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    open={!!editingUser}
                    onClose={() => setEditingUser(null)}
                />
            )}

            {resetPasswordUser && (
                <ResetPasswordModal
                    user={resetPasswordUser}
                    open={!!resetPasswordUser}
                    onClose={() => setResetPasswordUser(null)}
                />
            )}

            {deletingUser && (
                <DeleteUserDialog
                    user={deletingUser}
                    open={!!deletingUser}
                    onClose={() => setDeletingUser(null)}
                />
            )}
        </>
    );
}

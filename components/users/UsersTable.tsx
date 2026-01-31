"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, Trash2, KeyRound, Power } from "lucide-react";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import ResetPasswordModal from "./ResetPasswordModal";
import DeleteUserDialog from "./DeleteUserDialog";
import { formatDistanceToNow } from "date-fns";

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
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    return (
        <>
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add User
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
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
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No users found. Click "Add User" to create one.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {user.name || "No Name"}
                                                </span>
                                                <span className="text-sm text-gray-500">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {user.lastLogin
                                                ? formatDistanceToNow(new Date(user.lastLogin), {
                                                    addSuffix: true,
                                                })
                                                : "Never"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingUser(user)}
                                                    title="Edit User"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setResetPasswordUser(user)}
                                                    title="Reset Password"
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeletingUser(user)}
                                                    title="Delete User"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AddUserModal open={showAddModal} onClose={() => setShowAddModal(false)} />
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

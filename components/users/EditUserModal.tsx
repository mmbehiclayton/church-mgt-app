"use client";

import { useState, useEffect } from "react";
import { updateUser } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { UserManagementUser } from "@/types/users";

interface Role {
    id: string;
    name: string;
    description: string | null;
}

interface EditUserModalProps {
    user: UserManagementUser;
    open: boolean;
    onClose: () => void;
}

export default function EditUserModal({ user, open, onClose }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        name: user.name || "",
        selectedRoleIds: user.userRoles.map((userRole) => userRole.role.id),
        isActive: user.isActive,
    });
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setFormData({
            name: user.name || "",
            selectedRoleIds: user.userRoles.map((userRole) => userRole.role.id),
            isActive: user.isActive,
        });
    }, [user]);

    useEffect(() => {
        if (open) {
            void loadRoles();
        }
    }, [open]);

    const loadRoles = async () => {
        setLoadingRoles(true);
        try {
            const response = await fetch("/api/rbac/roles");
            if (!response.ok) {
                toast.error("Failed to load roles");
                return;
            }

            const data: Role[] = await response.json();
            setRoles(data);
        } catch (error) {
            console.error("Error loading roles:", error);
            toast.error("Failed to load roles");
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleRoleChange = (roleId: string, checked: boolean) => {
        setFormData((prev) => ({
            ...prev,
            selectedRoleIds: checked
                ? [...prev.selectedRoleIds, roleId]
                : prev.selectedRoleIds.filter((id) => id !== roleId)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.selectedRoleIds.length === 0) {
            toast.error("Error", {
                description: "Please select at least one role",
            });
            return;
        }

        setLoading(true);

        const result = await updateUser(user.id, {
            name: formData.name || undefined,
            roleIds: formData.selectedRoleIds,
            isActive: formData.isActive,
        });

        setLoading(false);

        if (result.error) {
            toast.error("Error", {
                description: result.error,
            });
        } else {
            toast.success("Success", {
                description: "User updated successfully",
            });
            router.refresh();
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user.email}
                            disabled
                            className="bg-gray-100 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <Label>Roles</Label>
                        {loadingRoles ? (
                            <p className="text-sm text-gray-500">Loading roles...</p>
                        ) : (
                            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                                {roles.map((role) => (
                                    <div key={role.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`edit-role-${role.id}`}
                                            checked={formData.selectedRoleIds.includes(role.id)}
                                            onCheckedChange={(checked) =>
                                                handleRoleChange(role.id, checked === true)
                                            }
                                        />
                                        <Label
                                            htmlFor={`edit-role-${role.id}`}
                                            className="text-sm cursor-pointer"
                                        >
                                            {role.name}
                                            {role.description && (
                                                <span className="ml-1 text-gray-500">
                                                    - {role.description}
                                                </span>
                                            )}
                                        </Label>
                                    </div>
                                ))}
                                {roles.length === 0 && (
                                    <p className="text-sm text-gray-500">No roles available</p>
                                )}
                            </div>
                        )}
                        {formData.selectedRoleIds.length > 0 && (
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.selectedRoleIds.length} role{formData.selectedRoleIds.length === 1 ? "" : "s"} selected
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="isActive"
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="isActive" className="cursor-pointer">
                            Active Account
                        </Label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Updating..." : "Update User"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

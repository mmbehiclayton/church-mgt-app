"use client";

import { useState, useEffect } from "react";
import { createUser } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface AddUserModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AddUserModal({ open, onClose }: AddUserModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        selectedRoleIds: [] as string[],
        isActive: true,
    });
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadRoles();
        }
    }, [open]);

    const loadRoles = async () => {
        setLoadingRoles(true);
        try {
            const response = await fetch('/api/rbac/roles');
            if (response.ok) {
                const data = await response.json();
                setRoles(data);
            } else {
                toast.error("Failed to load roles");
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            toast.error("Failed to load roles");
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleRoleChange = (roleId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            selectedRoleIds: checked
                ? [...prev.selectedRoleIds, roleId]
                : prev.selectedRoleIds.filter(id => id !== roleId)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            toast.error("Error", {
                description: "Passwords do not match",
            });
            setLoading(false);
            return;
        }

        // Validate at least one role is selected
        if (formData.selectedRoleIds.length === 0) {
            toast.error("Error", {
                description: "Please select at least one role",
            });
            setLoading(false);
            return;
        }

        const result = await createUser({
            name: formData.name || undefined,
            email: formData.email,
            password: formData.password,
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
                description: "User created successfully",
            });
            setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
                selectedRoleIds: [],
                isActive: true,
            });
            router.refresh();
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <Label htmlFor="name">Name (Optional)</Label>
                        <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <Label htmlFor="email">
                            Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="user@example.com"
                        />
                    </div>

                    <div>
                        <Label htmlFor="password">
                            Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Minimum 6 characters"
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Password strength: {formData.password.length >= 8 ? "Strong" : formData.password.length >= 6 ? "Medium" : "Weak"}
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="confirmPassword">
                            Confirm Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={(e) =>
                                setFormData({ ...formData, confirmPassword: e.target.value })
                            }
                            placeholder="Re-enter password"
                        />
                    </div>

                    <div>
                        <Label>Roles <span className="text-red-500">*</span></Label>
                        {loadingRoles ? (
                            <p className="text-sm text-gray-500">Loading roles...</p>
                        ) : (
                            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                                {roles.map((role) => (
                                    <div key={role.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`role-${role.id}`}
                                            checked={formData.selectedRoleIds.includes(role.id)}
                                            onCheckedChange={(checked) =>
                                                handleRoleChange(role.id, checked as boolean)
                                            }
                                        />
                                        <Label
                                            htmlFor={`role-${role.id}`}
                                            className="text-sm cursor-pointer"
                                        >
                                            {role.name}
                                            {role.description && (
                                                <span className="text-gray-500 ml-1">
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
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.selectedRoleIds.length} role{formData.selectedRoleIds.length > 1 ? 's' : ''} selected
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
                            {loading ? "Creating..." : "Create User"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { deleteUser, getCurrentUserId } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { UserManagementUser } from "@/types/users";

interface DeleteUserDialogProps {
    user: UserManagementUser;
    open: boolean;
    onClose: () => void;
}

export default function DeleteUserDialog({ user, open, onClose }: DeleteUserDialogProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const roleNames = user.userRoles.map((userRole) => userRole.role.name);

    const handleDelete = async () => {
        setLoading(true);

        // Get current user ID
        const currentUserId = await getCurrentUserId();

        if (!currentUserId) {
            toast.error("Error", {
                description: "Unable to verify current user",
            });
            setLoading(false);
            return;
        }

        const result = await deleteUser(user.id, currentUserId);

        setLoading(false);

        if (result.error) {
            toast.error("Error", {
                description: result.error,
            });
        } else {
            toast.success("Success", {
                description: "User deleted successfully",
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
                    <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md p-4">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900">Warning</h3>
                            <p className="text-sm text-red-800 mt-1">
                                This action cannot be undone. This will permanently delete the user account.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-sm text-gray-600 mb-2">You are about to delete:</p>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-medium text-gray-900">Name:</span>{" "}
                                {user.name || "No Name"}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium text-gray-900">Email:</span> {user.email}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium text-gray-900">Roles:</span> {roleNames.length > 0 ? roleNames.join(", ") : user.role}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {loading ? "Deleting..." : "Delete User"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

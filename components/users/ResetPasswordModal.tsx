"use client";

import { useState } from "react";
import { resetUserPassword } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    name: string | null;
}

interface ResetPasswordModalProps {
    user: User;
    open: boolean;
    onClose: () => void;
}

export default function ResetPasswordModal({ user, open, onClose }: ResetPasswordModalProps) {
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validate passwords match
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error("Error", {
                description: "Passwords do not match",
            });
            setLoading(false);
            return;
        }

        const result = await resetUserPassword(user.id, formData.newPassword);

        setLoading(false);

        if (result.error) {
            toast.error("Error", {
                description: result.error,
            });
        } else {
            toast.success("Success", {
                description: "Password reset successfully",
            });
            setFormData({ newPassword: "", confirmPassword: "" });
            router.refresh();
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-blue-800">
                            Resetting password for: <strong>{user.name || user.email}</strong>
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="newPassword">
                            New Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="newPassword"
                            type="password"
                            required
                            value={formData.newPassword}
                            onChange={(e) =>
                                setFormData({ ...formData, newPassword: e.target.value })
                            }
                            placeholder="Minimum 6 characters"
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Password strength:{" "}
                            {formData.newPassword.length >= 8
                                ? "Strong"
                                : formData.newPassword.length >= 6
                                    ? "Medium"
                                    : "Weak"}
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

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

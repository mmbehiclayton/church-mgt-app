"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { deleteMember } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
}

interface DeleteMemberDialogProps {
    member: Member;
    open: boolean;
    onClose: () => void;
}

export default function DeleteMemberDialog({ member, open, onClose }: DeleteMemberDialogProps) {
    const router = useRouter();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);

        const result = await deleteMember(member.id);

        if (result.error) {
            addToast({
                title: "Error",
                description: result.error,
                variant: "error"
            });
        } else {
            addToast({
                title: "Success",
                description: "Member deleted successfully",
                variant: "success"
            });
            router.refresh();
            onClose();
        }

        setLoading(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Delete Member</h2>
                            <p className="text-sm text-gray-500">This action cannot be undone</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-700">
                            Are you sure you want to delete <span className="font-semibold">{member.fullName}</span>?
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Phone: {member.phoneNumber}</p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading ? "Deleting..." : "Delete Member"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

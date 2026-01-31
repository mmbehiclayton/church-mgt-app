"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { updateMember } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface Department {
    id: string;
    name: string;
}

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    homeFellowshipId?: string | null;
    departments: {
        department: {
            id: string;
            name: string;
        }
    }[];
}

interface HomeFellowship {
    id: string;
    name: string;
}

interface EditMemberModalProps {
    member: Member;
    open: boolean;
    onClose: () => void;
    departments: Department[];
    homeFellowships: HomeFellowship[];
}

export default function EditMemberModal({ member, open, onClose, departments, homeFellowships }: EditMemberModalProps) {
    const router = useRouter();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: member.fullName,
        phoneNumber: member.phoneNumber,
        gender: member.gender,
        departmentIds: member.departments.map(d => d.department.id),
        homeFellowshipId: member.homeFellowshipId || ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await updateMember(member.id, {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            gender: formData.gender,
            departmentIds: formData.departmentIds,
            homeFellowshipId: formData.homeFellowshipId || null
        });

        if (result.error) {
            addToast({
                title: "Error",
                description: result.error,
                variant: "error"
            });
        } else {
            addToast({
                title: "Success",
                description: "Member updated successfully",
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
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold">Edit Member</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            required
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Home Fellowship
                        </label>
                        <select
                            value={formData.homeFellowshipId}
                            onChange={(e) => setFormData({ ...formData, homeFellowshipId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">None</option>
                            {homeFellowships.map(hf => (
                                <option key={hf.id} value={hf.id}>{hf.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Departments
                        </label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                            {departments.length === 0 ? (
                                <p className="text-sm text-gray-500">No departments available</p>
                            ) : (
                                departments.map(dept => (
                                    <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={formData.departmentIds.includes(dept.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        departmentIds: [...formData.departmentIds, dept.id]
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        departmentIds: formData.departmentIds.filter(id => id !== dept.id)
                                                    });
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{dept.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Updating..." : "Update Member"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

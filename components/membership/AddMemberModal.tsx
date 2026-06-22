"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { createMember } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Department { id: string; name: string; }
interface HomeFellowship { id: string; name: string; }
interface AccountabilityGroup { id: string; name: string; }

interface AddMemberModalProps {
    open: boolean;
    onClose: () => void;
    departments: Department[];
    homeFellowships: HomeFellowship[];
    accountabilityGroups: AccountabilityGroup[];
}

const INPUT = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

export default function AddMemberModal({ open, onClose, departments, homeFellowships, accountabilityGroups }: AddMemberModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phoneNumber: "",
        gender: "",
        estate: "",
        status: "Active",
        dateJoined: "",
        departmentIds: [] as string[],
        homeFellowshipId: "",
        accountabilityGroupId: "",
    });

    const set = (k: string, v: unknown) => setFormData(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await createMember({
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            gender: formData.gender,
            estate: formData.estate,
            status: formData.status,
            dateJoined: formData.dateJoined || undefined,
            departmentIds: formData.departmentIds,
            homeFellowshipId: formData.homeFellowshipId || undefined,
            accountabilityGroupId: formData.accountabilityGroupId || undefined,
        });

        if (result.error) {
            toast.error("Error", { description: result.error });
        } else {
            toast.success("Member created successfully");
            router.refresh();
            onClose();
        }
        setLoading(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b shrink-0">
                    <h2 className="text-xl font-semibold">Add New Member</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input type="text" required value={formData.fullName}
                            onChange={e => set("fullName", e.target.value)}
                            className={INPUT} placeholder="John Doe" />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input type="tel" required value={formData.phoneNumber}
                            onChange={e => set("phoneNumber", e.target.value)}
                            className={INPUT} placeholder="0712345678" />
                    </div>

                    {/* Gender + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Gender <span className="text-red-500">*</span>
                            </label>
                            <select required value={formData.gender} onChange={e => set("gender", e.target.value)} className={INPUT}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select value={formData.status} onChange={e => set("status", e.target.value)} className={INPUT}>
                                <option value="Active">Active</option>
                                <option value="Visitor">Visitor</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Joined + Estate */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Joined</label>
                            <input type="date" value={formData.dateJoined}
                                onChange={e => set("dateJoined", e.target.value)}
                                className={INPUT} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estate</label>
                            <input type="text" value={formData.estate}
                                onChange={e => set("estate", e.target.value)}
                                className={INPUT} placeholder="e.g. Riverside" />
                        </div>
                    </div>

                    {/* Fellowship + Section */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Home Fellowship</label>
                            <select value={formData.homeFellowshipId} onChange={e => set("homeFellowshipId", e.target.value)} className={INPUT}>
                                <option value="">None</option>
                                {homeFellowships.map(hf => <option key={hf.id} value={hf.id}>{hf.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section (AG)</label>
                            <select value={formData.accountabilityGroupId} onChange={e => set("accountabilityGroupId", e.target.value)} className={INPUT}>
                                <option value="">None</option>
                                {accountabilityGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Departments */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Departments</label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-36 overflow-y-auto space-y-1">
                            {departments.length === 0 ? (
                                <p className="text-sm text-gray-500">No departments available</p>
                            ) : departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                    <input type="checkbox"
                                        checked={formData.departmentIds.includes(dept.id)}
                                        onChange={e => set("departmentIds", e.target.checked
                                            ? [...formData.departmentIds, dept.id]
                                            : formData.departmentIds.filter(id => id !== dept.id))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm text-gray-700">{dept.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Member"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

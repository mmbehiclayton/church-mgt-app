"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { createHomeFellowship } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface AddHomeFellowshipModalProps {
    open: boolean;
    onClose: () => void;
    members: { id: string; fullName: string }[];
}

export default function AddHomeFellowshipModal({ open, onClose, members }: AddHomeFellowshipModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        leader: "",
        location: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await createHomeFellowship({
            name: formData.name,
            leader: formData.leader || undefined,
            location: formData.location || undefined
        });

        if (result.error) {
            toast.error("Error", {
                description: result.error,
            });
        } else {
            toast.success("Success", {
                description: "Home Fellowship created successfully",
            });
            router.refresh();
            onClose();
            setFormData({ name: "", leader: "", location: "" });
        }

        setLoading(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold">Add New Home Fellowship</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Bethany, Berea"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Leader
                        </label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between font-normal"
                                >
                                    {formData.leader
                                        ? members.find((member) => member.fullName === formData.leader)?.fullName || formData.leader
                                        : "Select leader..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                    <CommandInput placeholder="Search member..." />
                                    <CommandList>
                                        <CommandEmpty>No member found.</CommandEmpty>
                                        <CommandGroup>
                                            {members.map((member) => (
                                                <CommandItem
                                                    key={member.id}
                                                    value={member.fullName}
                                                    onSelect={(currentValue) => {
                                                        setFormData({ ...formData, leader: currentValue === formData.leader ? "" : currentValue });
                                                        setOpenCombobox(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            formData.leader === member.fullName ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {member.fullName}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                        </label>
                        <textarea
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional meeting location"
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Fellowship"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

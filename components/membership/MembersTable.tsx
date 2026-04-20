"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, Trash2, Download, Filter, User, Building2, Menu, MoreHorizontal, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddMemberModal from "@/components/membership/AddMemberModal";
import EditMemberModal from "@/components/membership/EditMemberModal";
import DeleteMemberDialog from "@/components/membership/DeleteMemberDialog";
import ExportMembersButton from "@/components/membership/ExportMembersButton";
import AddDepartmentModal from "@/components/membership/AddDepartmentModal";
import AddHomeFellowshipModal from "@/components/membership/AddHomeFellowshipModal";
import { deleteMembers } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import BulkUploadModal from "@/components/membership/BulkUploadModal";
import { Upload } from "lucide-react";

interface Department {
    id: string;
    name: string;
    description: string | null;
    _count: {
        members: number;
    };
}

interface HomeFellowship {
    id: string;
    name: string;
}

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    estate: string | null;
    homeFellowshipId: string | null;
    homeFellowship: HomeFellowship | null;
    departments: {
        department: {
            id: string;
            name: string;
        }
    }[];
}

interface MembersTableProps {
    members: Member[];
    departments: Department[];
    homeFellowships: HomeFellowship[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export default function MembersTable({ members, departments, homeFellowships, pagination }: MembersTableProps) {
    const router = useRouter();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
    const [showAddHomeFellowshipModal, setShowAddHomeFellowshipModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [deletingMember, setDeletingMember] = useState<Member | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [filterDepartment, setFilterDepartment] = useState<string>("");
    const [filterGender, setFilterGender] = useState<string>("");

    // Filter members based on selected filters
    const filteredMembers = members.filter(member => {
        if (filterDepartment && !member.departments.some(d => d.department.id === filterDepartment)) return false;
        if (filterGender && member.gender !== filterGender) return false;
        return true;
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredMembers.map(m => m.id));
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

    const executeBulkDelete = async () => {
        setBulkDeleting(true);
        const result = await deleteMembers(selectedIds);

        if (result.error) {
            toast.error("Error", {
                description: result.error,
            });
        } else {
            toast.success("Success", {
                description: `Deleted ${selectedIds.length} member(s)`,
            });
            setSelectedIds([]);
        }

        setBulkDeleting(false);
        setShowBulkDeleteDialog(false);
        router.refresh();
    };

    const handleBulkDelete = () => {
        setShowBulkDeleteDialog(true);
    };

    // Generate avatar color based on name
    const getAvatarColor = (name: string) => {
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
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Get initials from name
    const getInitials = (name: string) => {
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                            {selectedIds.length > 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedIds.length} member(s) selected
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Filters */}
                            <select
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>

                            <select
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Genders</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>

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

                            <div className="flex items-center gap-2">
                                {/* Mobile Actions Menu */}
                                <div className="md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon">
                                                <Menu className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setShowAddModal(true)}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add Member
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setShowAddDepartmentModal(true)}>
                                                <Layers className="mr-2 h-4 w-4" />
                                                Add Department
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setShowAddHomeFellowshipModal(true)}>
                                                <Building2 className="mr-2 h-4 w-4" />
                                                Add Fellowship
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setShowUploadModal(true)}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Import Members
                                            </DropdownMenuItem>
                                            <ExportMembersButton
                                                members={members}
                                                departments={departments}
                                                homeFellowships={homeFellowships}
                                                asMenuItem={true}
                                            />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Desktop Actions */}
                                <div className="hidden md:flex items-center gap-2">
                                    <ExportMembersButton
                                        members={members}
                                        departments={departments}
                                        homeFellowships={homeFellowships}
                                    />

                                    <Button
                                        onClick={() => setShowAddDepartmentModal(true)}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <Layers className="h-4 w-4" />
                                        Add Department
                                    </Button>

                                    <Button
                                        onClick={() => setShowAddHomeFellowshipModal(true)}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <Building2 className="h-4 w-4" />
                                        Add Fellowship
                                    </Button>

                                    <Button 
                                        onClick={() => setShowUploadModal(true)} 
                                        variant="outline" 
                                        className="flex items-center gap-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Import
                                    </Button>

                                    <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Add Member
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <Checkbox
                                        checked={selectedIds.length === filteredMembers.length && filteredMembers.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Member
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Phone Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gender
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fellowship
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estate
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredMembers.map((member, index) => (
                                <tr
                                    key={member.id}
                                    className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(member.id) ? "bg-blue-50" : ""
                                        }`}
                                >
                                    <td className="px-6 py-4">
                                        <Checkbox
                                            checked={selectedIds.includes(member.id)}
                                            onCheckedChange={(checked) => handleSelectRow(member.id, checked as boolean)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${getAvatarColor(member.fullName)} flex items-center justify-center text-white font-semibold`}>
                                                {getInitials(member.fullName)}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {member.fullName}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {member.phoneNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${member.gender === "Male"
                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                            : "bg-pink-100 text-pink-800 border-pink-200"
                                            }`}>
                                            {member.gender}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {member.departments.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {member.departments.map(({ department }) => (
                                                    <span
                                                        key={department.id}
                                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
                                                    >
                                                        {department.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}

                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {member.homeFellowship?.name || <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                        {member.estate || <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingMember(member)}
                                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingMember(member)}
                                                className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredMembers.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <User className="h-12 w-12 mb-2 text-gray-400" />
                                            <p className="text-sm font-medium">No members found</p>
                                            <p className="text-xs mt-1">
                                                {filterDepartment || filterGender
                                                    ? "Try adjusting your filters"
                                                    : "Get started by adding a new member"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <AddMemberModal
                    open={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    departments={departments}
                    homeFellowships={homeFellowships}
                />
            )}

            {showAddHomeFellowshipModal && (
                <AddHomeFellowshipModal
                    open={showAddHomeFellowshipModal}
                    onClose={() => setShowAddHomeFellowshipModal(false)}
                    members={members}
                />
            )}

            {showAddDepartmentModal && (
                <AddDepartmentModal
                    open={showAddDepartmentModal}
                    onClose={() => setShowAddDepartmentModal(false)}
                />
            )}

            {editingMember && (
                <EditMemberModal
                    member={editingMember}
                    open={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    departments={departments}
                    homeFellowships={homeFellowships}
                />
            )}

            {deletingMember && (
                <DeleteMemberDialog
                    member={deletingMember}
                    open={!!deletingMember}
                    onClose={() => setDeletingMember(null)}
                />
            )}

            <ConfirmationDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
                title="Delete Members"
                description={`Are you sure you want to delete ${selectedIds.length} member(s)?`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={executeBulkDelete}
                variant="danger"
                loading={bulkDeleting}
            />

            {showUploadModal && (
                <BulkUploadModal 
                    open={showUploadModal} 
                    onClose={() => setShowUploadModal(false)} 
                />
            )}
        </>
    );
}

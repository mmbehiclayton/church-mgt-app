"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import ExcelJS from "exceljs";

interface Department {
    id: string;
    name: string;
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
    homeFellowshipId: string | null;
    departments: {
        department: Department;
    }[];
}

interface ExportMembersButtonProps {
    members: Member[];
    departments: Department[];
    homeFellowships: HomeFellowship[];
}

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface ExportMembersButtonProps {
    members: Member[];
    departments: Department[];
    homeFellowships: HomeFellowship[];
    asMenuItem?: boolean;
}

export default function ExportMembersButton({ members, departments, homeFellowships, asMenuItem = false }: ExportMembersButtonProps) {
    const [showDialog, setShowDialog] = useState(false);
    const [exportType, setExportType] = useState<"all" | "department" | "gender" | "fellowship">("all");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedFellowship, setSelectedFellowship] = useState("");

    const handleExport = async () => {
        let filteredMembers = [...members];
        let filterDescription = "All Members";

        // Apply filters
        if (exportType === "department" && selectedDepartment) {
            filteredMembers = members.filter(m => m.departments.some(d => d.department.id === selectedDepartment));
            const dept = departments.find(d => d.id === selectedDepartment);
            filterDescription = `${dept?.name} Department`;
        } else if (exportType === "gender" && selectedGender) {
            filteredMembers = members.filter(m => m.gender === selectedGender);
            filterDescription = `${selectedGender} Members`;
        } else if (exportType === "fellowship" && selectedFellowship) {
            filteredMembers = members.filter(m => m.homeFellowshipId === selectedFellowship);
            const fellowship = homeFellowships.find(f => f.id === selectedFellowship);
            filterDescription = `${fellowship?.name} Fellowship`;
        }

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Members");

        // Add title
        worksheet.mergeCells("A1:F1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "Church Membership Report";
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        // Add filter info
        worksheet.mergeCells("A2:F2");
        const filterCell = worksheet.getCell("A2");
        filterCell.value = filterDescription;
        filterCell.font = { size: 12 };
        filterCell.alignment = { horizontal: "center" };

        // Add date
        worksheet.mergeCells("A3:F3");
        const dateCell = worksheet.getCell("A3");
        dateCell.value = `Generated on: ${new Date().toLocaleDateString()}`;
        dateCell.font = { size: 10, italic: true };
        dateCell.alignment = { horizontal: "center" };

        // Add empty row
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow(["#", "Full Name", "Phone Number", "Gender", "Fellowship", "Departments"]);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" }
        };

        // Add data
        filteredMembers.forEach((member, index) => {
            const deptNames = member.departments.map(d => d.department.name).join(", ");
            const fellowshipName = homeFellowships.find(f => f.id === member.homeFellowshipId)?.name || "-";

            worksheet.addRow([
                index + 1,
                member.fullName,
                member.phoneNumber,
                member.gender,
                fellowshipName,
                deptNames || "-"
            ]);
        });

        // Add total row
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(["Total Members:", filteredMembers.length]);
        totalRow.font = { bold: true };

        // Set column widths
        worksheet.getColumn(1).width = 8;
        worksheet.getColumn(2).width = 25;
        worksheet.getColumn(3).width = 20;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 20;
        worksheet.getColumn(6).width = 30;

        // Add borders to data
        const dataStartRow = 5;
        const dataEndRow = 5 + filteredMembers.length;
        for (let row = dataStartRow; row <= dataEndRow; row++) {
            for (let col = 1; col <= 6; col++) {
                const cell = worksheet.getCell(row, col);
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            }
        }

        // Generate and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `members_${filterDescription.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);

        setShowDialog(false);
    };

    return (
        <>
            {asMenuItem ? (
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setShowDialog(true);
                    }}
                >
                    <Download className="mr-2 h-4 w-4" />
                    Export Members
                </DropdownMenuItem>
            ) : (
                <Button
                    onClick={() => setShowDialog(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            )}

            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold">Export Members</h2>
                            <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Export Type
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="exportType"
                                            value="all"
                                            checked={exportType === "all"}
                                            onChange={(e) => setExportType(e.target.value as "all" | "department" | "gender" | "fellowship")}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm">All Members ({members.length})</span>
                                    </label>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="exportType"
                                            value="department"
                                            checked={exportType === "department"}
                                            onChange={(e) => setExportType(e.target.value as "all" | "department" | "gender" | "fellowship")}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm">By Department</span>
                                    </label>

                                    {exportType === "department" && (
                                        <select
                                            value={selectedDepartment}
                                            onChange={(e) => setSelectedDepartment(e.target.value)}
                                            className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="exportType"
                                            value="fellowship"
                                            checked={exportType === "fellowship"}
                                            onChange={(e) => setExportType(e.target.value as "all" | "department" | "gender" | "fellowship")}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm">By Fellowship</span>
                                    </label>

                                    {exportType === "fellowship" && (
                                        <select
                                            value={selectedFellowship}
                                            onChange={(e) => setSelectedFellowship(e.target.value)}
                                            className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="">Select Fellowship</option>
                                            {homeFellowships.map(fellowship => (
                                                <option key={fellowship.id} value={fellowship.id}>{fellowship.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="exportType"
                                            value="gender"
                                            checked={exportType === "gender"}
                                            onChange={(e) => setExportType(e.target.value as "all" | "department" | "gender" | "fellowship")}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm">By Gender</span>
                                    </label>

                                    {exportType === "gender" && (
                                        <select
                                            value={selectedGender}
                                            onChange={(e) => setSelectedGender(e.target.value)}
                                            className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    disabled={
                                        (exportType === "department" && !selectedDepartment) ||
                                        (exportType === "gender" && !selectedGender) ||
                                        (exportType === "fellowship" && !selectedFellowship)
                                    }
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export to Excel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

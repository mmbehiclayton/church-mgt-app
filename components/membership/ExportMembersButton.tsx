"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import ExcelJS from "exceljs";
import { getMembersWithoutPhone } from "@/app/actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
    departments: { department: Department }[];
}

interface ExportMembersButtonProps {
    members: Member[];
    departments: Department[];
    homeFellowships: HomeFellowship[];
    asMenuItem?: boolean;
}

type ExportType = "all" | "department" | "gender" | "fellowship" | "no_phone";

export default function ExportMembersButton({ members, departments, homeFellowships, asMenuItem = false }: ExportMembersButtonProps) {
    const [showDialog, setShowDialog] = useState(false);
    const [exportType, setExportType] = useState<ExportType>("all");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedFellowship, setSelectedFellowship] = useState("");
    const [exporting, setExporting] = useState(false);

    const buildAndDownload = async (
        rows: { fullName: string; phoneNumber: string; gender: string; fellowship: string; departments: string }[],
        label: string,
        filename: string
    ) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Members");

        worksheet.mergeCells("A1:F1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "Church Membership Report";
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        worksheet.mergeCells("A2:F2");
        const labelCell = worksheet.getCell("A2");
        labelCell.value = label;
        labelCell.font = { size: 12 };
        labelCell.alignment = { horizontal: "center" };

        worksheet.mergeCells("A3:F3");
        const dateCell = worksheet.getCell("A3");
        dateCell.value = `Generated on: ${new Date().toLocaleDateString()}`;
        dateCell.font = { size: 10, italic: true };
        dateCell.alignment = { horizontal: "center" };

        worksheet.addRow([]);

        const headerRow = worksheet.addRow(["#", "Full Name", "Phone Number", "Gender", "Fellowship", "Departments"]);
        headerRow.font = { bold: true };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

        rows.forEach((r, i) => {
            worksheet.addRow([i + 1, r.fullName, r.phoneNumber, r.gender, r.fellowship, r.departments]);
        });

        worksheet.addRow([]);
        const totalRow = worksheet.addRow(["Total Members:", rows.length]);
        totalRow.font = { bold: true };

        worksheet.getColumn(1).width = 8;
        worksheet.getColumn(2).width = 25;
        worksheet.getColumn(3).width = 20;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 20;
        worksheet.getColumn(6).width = 30;

        for (let row = 5; row <= 5 + rows.length; row++) {
            for (let col = 1; col <= 6; col++) {
                worksheet.getCell(row, col).border = {
                    top: { style: "thin" }, left: { style: "thin" },
                    bottom: { style: "thin" }, right: { style: "thin" },
                };
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setExporting(true);
        const date = new Date().toISOString().split("T")[0];
        try {
            if (exportType === "no_phone") {
                const result = await getMembersWithoutPhone();
                if (result.error || !result.data) return;
                const rows = result.data.map(m => ({
                    fullName: m.fullName,
                    phoneNumber: m.phoneNumber || "",
                    gender: m.gender,
                    fellowship: m.homeFellowship?.name || "-",
                    departments: m.departments.map(d => d.department.name).join(", ") || "-",
                }));
                await buildAndDownload(rows, "Members Without Phone Numbers", `members_no_phone_${date}.xlsx`);
                setShowDialog(false);
                return;
            }

            let filtered = [...members];
            let label = "All Members";

            if (exportType === "department" && selectedDepartment) {
                filtered = members.filter(m => m.departments.some(d => d.department.id === selectedDepartment));
                label = `${departments.find(d => d.id === selectedDepartment)?.name} Department`;
            } else if (exportType === "gender" && selectedGender) {
                filtered = members.filter(m => m.gender === selectedGender);
                label = `${selectedGender} Members`;
            } else if (exportType === "fellowship" && selectedFellowship) {
                filtered = members.filter(m => m.homeFellowshipId === selectedFellowship);
                label = `${homeFellowships.find(f => f.id === selectedFellowship)?.name} Fellowship`;
            }

            const rows = filtered.map(m => ({
                fullName: m.fullName,
                phoneNumber: m.phoneNumber,
                gender: m.gender,
                fellowship: homeFellowships.find(f => f.id === m.homeFellowshipId)?.name || "-",
                departments: m.departments.map(d => d.department.name).join(", ") || "-",
            }));
            await buildAndDownload(rows, label, `members_${label.replace(/\s+/g, "_").toLowerCase()}_${date}.xlsx`);
            setShowDialog(false);
        } finally {
            setExporting(false);
        }
    };

    const isDisabled =
        exporting ||
        (exportType === "department" && !selectedDepartment) ||
        (exportType === "gender" && !selectedGender) ||
        (exportType === "fellowship" && !selectedFellowship);

    return (
        <>
            {asMenuItem ? (
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowDialog(true); }}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Members
                </DropdownMenuItem>
            ) : (
                <Button onClick={() => setShowDialog(true)} variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            )}

            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-semibold">Export Members</h2>
                            <button onClick={() => setShowDialog(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Export Type</label>
                                <div className="space-y-2">
                                    {[
                                        { value: "all", label: `All Members (${members.length})` },
                                        { value: "department", label: "By Department" },
                                        { value: "fellowship", label: "By Fellowship" },
                                        { value: "gender", label: "By Gender" },
                                        { value: "no_phone", label: "Missing Phone Numbers" },
                                    ].map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="exportType"
                                                value={opt.value}
                                                checked={exportType === opt.value}
                                                onChange={(e) => { setExportType(e.target.value as ExportType); setSelectedDepartment(""); setSelectedGender(""); setSelectedFellowship(""); }}
                                                className="text-blue-600"
                                            />
                                            <span className="text-sm">{opt.label}</span>
                                        </label>
                                    ))}

                                    {exportType === "department" && (
                                        <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="ml-6 w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground">
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    )}
                                    {exportType === "fellowship" && (
                                        <select value={selectedFellowship} onChange={(e) => setSelectedFellowship(e.target.value)} className="ml-6 w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground">
                                            <option value="">Select Fellowship</option>
                                            {homeFellowships.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                    )}
                                    {exportType === "gender" && (
                                        <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className="ml-6 w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground">
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowDialog(false)} disabled={exporting}>Cancel</Button>
                                <Button onClick={handleExport} disabled={isDisabled}>
                                    {exporting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            Exporting…
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Download className="h-4 w-4" />
                                            Export to Excel
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

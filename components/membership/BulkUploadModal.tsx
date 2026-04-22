"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { importMembers } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BulkUploadModalProps {
    open: boolean;
    onClose: () => void;
}

export default function BulkUploadModal({ open, onClose }: BulkUploadModalProps) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<Array<Array<string>>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const normalizeCell = (value: unknown) => {
        if (typeof value === "string") {
            return value.trim();
        }

        if (typeof value === "number") {
            return value.toString();
        }

        return "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
                setPreviewData(
                    data.slice(0, 6).map((row) => row.map((cell) => normalizeCell(cell)))
                );
            };
            reader.readAsBinaryString(selectedFile);
        }
    };

    const downloadTemplate = () => {
        const template = [
            ["Full Name", "Phone Number", "Gender", "Estate", "Fellowship Name", "Department Names"],
            ["John Doe", "0712345678", "Male", "Riverside", "Main Fellowship", "Choir, Ushering"],
            ["Jane Smith", "0787654321", "Female", "Hillside", "Youth Fellowship", "Media"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "member_upload_template.xlsx");
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

                // Map headers to expected format
                const mappedData = rawData.map((row) => ({
                    fullName: normalizeCell(row["Full Name"] ?? row["fullName"] ?? row["Name"]),
                    phoneNumber: normalizeCell(row["Phone Number"] ?? row["phoneNumber"] ?? row["Phone"] ?? row["Mobile"]),
                    gender: normalizeCell(row["Gender"] ?? row["gender"]),
                    estate: normalizeCell(row["Estate"] ?? row["estate"]) || undefined,
                    fellowshipName: normalizeCell(row["Fellowship Name"] ?? row["fellowshipName"] ?? row["Fellowship"]) || undefined,
                    departmentNames: normalizeCell(row["Department Names"] ?? row["departmentNames"] ?? row["Departments"]) || undefined
                }));

                const result = await importMembers(mappedData);

                if (result.error) {
                    toast.error("Import Failed", { description: result.error });
                } else {
                    toast.success("Import Successful", { 
                        description: `Imported ${result.count} members. ${result.skipped} rows skipped.` 
                    });
                    router.refresh();
                    onClose();
                }
                setLoading(false);
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error("Import Error:", error);
            toast.error("Error", { description: "Failed to process file" });
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Upload className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Import Members</h2>
                            <p className="text-sm text-gray-500">Upload multiple members at once using Excel or CSV</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Template Section */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-4">
                        <div className="mt-1">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900">Before you upload</h3>
                            <p className="text-sm text-blue-800 mt-1">
                                Ensure your file follows the required format. Name, Phone, and Gender are required. Fellowship and Departments must already exist in the system.
                            </p>
                            <Button 
                                onClick={downloadTemplate} 
                                size="sm" 
                                variant="outline" 
                                className="mt-3 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 font-medium h-9"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download Template
                            </Button>
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                            file ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                        }`}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".xlsx, .xls, .csv"
                        />
                        
                        {file ? (
                            <>
                                <div className="p-4 bg-green-100 rounded-full mb-4 ring-8 ring-green-50">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                                <p className="font-semibold text-green-900">{file.name}</p>
                                <p className="text-sm text-green-600">Click to change file</p>
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-gray-100 rounded-full mb-4 ring-8 ring-gray-50 group-hover:ring-blue-50 group-hover:bg-blue-100 transition-all">
                                    <FileText className="h-8 w-8 text-gray-500 group-hover:text-blue-600" />
                                </div>
                                <p className="font-semibold text-gray-900">Choose a file or drag it here</p>
                                <p className="text-sm text-gray-400 mt-1">Excel (.xlsx, .xls) or CSV files supported</p>
                            </>
                        )}
                    </div>

                    {/* Preview Table */}
                    {previewData.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">File Preview (First 5 rows)</h4>
                            <div className="border rounded-lg overflow-x-auto max-h-40">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 border-b sticky top-0">
                                        <tr>
                                            {previewData[0].map((header: string, i: number) => (
                                                <th key={i} className="px-4 py-2 font-medium text-gray-500 truncate max-w-[150px]">{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {previewData.slice(1).map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                {Array.isArray(row) ? row.map((cell: string, j: number) => (
                                                    <td key={j} className="px-4 py-2 text-gray-600 truncate max-w-[150px]">{cell}</td>
                                                )) : null}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={!file || loading}
                        className="bg-blue-600 hover:bg-blue-700 px-8"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Start Import
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

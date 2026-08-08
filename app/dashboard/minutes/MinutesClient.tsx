"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { AccessDenied } from "@/components/ui/access-denied";
import { usePermissions } from "@/hooks/usePermissions";
import { getMinutes, deleteMinutes, type MinutesRecord } from "./actions";
import { toast } from "sonner";
import {
    FileText, Upload, Search, Trash2, Download, Eye,
    X, ChevronLeft, ChevronRight, Calendar, Tag,
    Loader2, Plus, Share2, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MEETING_TYPE_OPTIONS = [
    "Board Meeting",
    "Sunday Service",
    "Committee Meeting",
    "General Assembly",
    "Prayer Meeting",
    "Youth Meeting",
    "Other",
];

const TYPE_ALL = "__all__";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-KE", {
        day: "numeric", month: "short", year: "numeric",
    });
}

const TYPE_COLOURS: Record<string, string> = {
    "Board Meeting":      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "Sunday Service":     "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "Committee Meeting":  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "General Assembly":   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "Prayer Meeting":     "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    "Youth Meeting":      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
};

function typeColour(type: string): string {
    return TYPE_COLOURS[type] ?? "bg-muted text-muted-foreground";
}

function shareUrl(id: string): string {
    return `${window.location.origin}/api/minutes/${id}/share`;
}

interface Props {
    initialMinutes: MinutesRecord[];
    initialPagination: { total: number; page: number; limit: number; pages: number };
    meetingTypes: string[];
}

export default function MinutesClient({ initialMinutes, initialPagination, meetingTypes }: Props) {
    const { hasPermission } = usePermissions();
    const canUpload = hasPermission("minutes:create");
    const canDelete = hasPermission("minutes:delete");

    const [minutes, setMinutes] = useState<MinutesRecord[]>(initialMinutes);
    const [pagination, setPagination] = useState(initialPagination);
    const [isPending, startTransition] = useTransition();

    // Search & filter
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [filterType, setFilterType] = useState(TYPE_ALL);

    // Upload dialog
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        title: "", meetingDate: "", meetingType: "", description: "",
    });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Share dialog
    const [shareDocId, setShareDocId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Debounce
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchInput]);

    useEffect(() => {
        fetchMinutes(debouncedSearch, filterType, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, filterType]);

    function fetchMinutes(search: string, type: string, page: number) {
        startTransition(async () => {
            const result = await getMinutes({
                search: search || undefined,
                meetingType: type !== TYPE_ALL ? type : undefined,
                page, limit: 20,
            });
            setMinutes(result.data);
            setPagination(result.pagination);
        });
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!uploadFile) { toast.error("Please select a PDF file"); return; }
        if (!uploadForm.title.trim()) { toast.error("Title is required"); return; }
        if (!uploadForm.meetingDate) { toast.error("Meeting date is required"); return; }
        if (!uploadForm.meetingType) { toast.error("Meeting type is required"); return; }

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            fd.append("title", uploadForm.title.trim());
            fd.append("meetingDate", uploadForm.meetingDate);
            fd.append("meetingType", uploadForm.meetingType);
            fd.append("description", uploadForm.description);

            const res = await fetch("/api/minutes/upload", { method: "POST", body: fd });
            const json = await res.json();
            if (!res.ok) { toast.error(json.error ?? "Upload failed"); return; }

            toast.success("Minutes uploaded successfully");
            setShowUpload(false);
            setUploadForm({ title: "", meetingDate: "", meetingType: "", description: "" });
            setUploadFile(null);
            fetchMinutes(debouncedSearch, filterType, 1);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete() {
        if (!deletingId) return;
        setDeleting(true);
        const result = await deleteMinutes(deletingId);
        if (result.error) toast.error(result.error);
        else toast.success("Minutes deleted");
        setDeleting(false);
        setDeletingId(null);
        fetchMinutes(debouncedSearch, filterType, pagination.page);
    }

    function handleCopyShare() {
        if (!shareDocId) return;
        navigator.clipboard.writeText(shareUrl(shareDocId)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const allTypes = Array.from(new Set([...MEETING_TYPE_OPTIONS, ...meetingTypes]));
    const hasFilters = filterType !== TYPE_ALL || searchInput;

    if (!hasPermission("minutes:read")) {
        return (
            <div className="flex items-center justify-center h-64">
                <AccessDenied description="You don't have permission to view meeting minutes." />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Meeting Minutes</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Upload, browse, and share meeting records as PDFs
                        </p>
                    </div>
                    {canUpload && (
                        <Button onClick={() => setShowUpload(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Upload Minutes
                        </Button>
                    )}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search title or notes…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-9 h-9"
                        />
                        {searchInput && (
                            <button onClick={() => setSearchInput("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-9 w-[180px] text-sm">
                            <SelectValue placeholder="Meeting Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TYPE_ALL}>All Types</SelectItem>
                            {allTypes.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasFilters && (
                        <button onClick={() => { setSearchInput(""); setFilterType(TYPE_ALL); }}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-border">
                            <X className="h-3.5 w-3.5" /> Clear
                        </button>
                    )}

                    {isPending && (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin self-center" />
                    )}

                    <p className="ml-auto text-sm text-muted-foreground">
                        {pagination.total} document{pagination.total !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* List */}
                {minutes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 py-20 flex flex-col items-center gap-3 text-muted-foreground">
                        <FileText className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">No minutes found</p>
                        <p className="text-xs">
                            {hasFilters ? "Try adjusting your search or filter" : "Upload your first PDF to get started"}
                        </p>
                        {canUpload && !hasFilters && (
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowUpload(true)}>
                                <Upload className="h-4 w-4 mr-1.5" /> Upload Minutes
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Meeting Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Uploaded By</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Size</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {minutes.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors group">
                                        {/* Document title + mobile meta */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate max-w-[200px] sm:max-w-[280px]">{doc.title}</p>
                                                    {doc.description && (
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[280px] mt-0.5">{doc.description}</p>
                                                    )}
                                                    {/* Mobile-only meta */}
                                                    <div className="flex items-center gap-2 mt-1 sm:hidden">
                                                        <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium", typeColour(doc.meetingType))}>
                                                            {doc.meetingType}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(doc.meetingDate)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", typeColour(doc.meetingType))}>
                                                {doc.meetingType}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                {formatDate(doc.meetingDate)}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                                            {doc.uploadedByName ?? "—"}
                                        </td>

                                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                                            <span className="flex items-center gap-1">
                                                <Tag className="h-3.5 w-3.5 shrink-0" />
                                                {formatBytes(doc.fileSize)}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <a href={`/api/minutes/${doc.id}/file`} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" title="View PDF">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </a>
                                                <a href={`/api/minutes/${doc.id}/file?download=1`}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" title="Download">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </a>
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                    title="Share link"
                                                    onClick={() => { setShareDocId(doc.id); setCopied(false); }}
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                        title="Delete"
                                                        onClick={() => setDeletingId(doc.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Page {pagination.page} of {pagination.pages} · {pagination.total} documents
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm"
                                disabled={pagination.page === 1 || isPending}
                                onClick={() => fetchMinutes(debouncedSearch, filterType, pagination.page - 1)}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button variant="outline" size="sm"
                                disabled={pagination.page === pagination.pages || isPending}
                                onClick={() => fetchMinutes(debouncedSearch, filterType, pagination.page + 1)}>
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Upload Dialog ── */}
            <Dialog open={showUpload} onOpenChange={(o) => { if (!uploading) setShowUpload(o); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Upload Meeting Minutes</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="min-title">Title <span className="text-destructive">*</span></Label>
                            <Input id="min-title" placeholder="e.g. January Board Meeting 2025"
                                value={uploadForm.title}
                                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} required />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="min-date">Meeting Date <span className="text-destructive">*</span></Label>
                                <Input id="min-date" type="date"
                                    value={uploadForm.meetingDate}
                                    onChange={(e) => setUploadForm((f) => ({ ...f, meetingDate: e.target.value }))} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="min-type">Meeting Type <span className="text-destructive">*</span></Label>
                                <Select value={uploadForm.meetingType}
                                    onValueChange={(v) => setUploadForm((f) => ({ ...f, meetingType: v }))}>
                                    <SelectTrigger id="min-type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MEETING_TYPE_OPTIONS.map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="min-desc">Description</Label>
                            <textarea id="min-desc" rows={2}
                                placeholder="Brief summary of what was discussed (optional)"
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </div>

                        {/* Drop zone */}
                        <div
                            className={cn("rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
                                uploadFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30")}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const f = e.dataTransfer.files[0];
                                if (f?.name.toLowerCase().endsWith(".pdf")) setUploadFile(f);
                                else toast.error("Only PDF files are accepted");
                            }}
                        >
                            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
                            {uploadFile ? (
                                <div className="flex flex-col items-center gap-1.5">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <p className="text-sm font-medium">{uploadFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                                    <button type="button"
                                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                                        className="text-xs text-muted-foreground hover:text-destructive mt-1">
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Upload className="h-8 w-8 opacity-40" />
                                    <p className="text-sm font-medium">Drop PDF here or click to browse</p>
                                    <p className="text-xs">Maximum 20 MB</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-1.5" />Upload</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Share Dialog ── */}
            <Dialog open={!!shareDocId} onOpenChange={(o) => { if (!o) setShareDocId(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-4 w-4" /> Share Document
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        <p className="text-sm text-muted-foreground">
                            Anyone with this link can open and read the PDF — no login required.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={shareDocId ? shareUrl(shareDocId) : ""}
                                className="font-mono text-xs"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <Button variant="outline" size="sm" className="shrink-0" onClick={handleCopyShare}>
                                {copied ? <><Check className="h-4 w-4 mr-1.5 text-green-500" />Copied!</> : <><Copy className="h-4 w-4 mr-1.5" />Copy</>}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setShareDocId(null)}>Close</Button>
                        <a href={shareDocId ? shareUrl(shareDocId) : "#"} target="_blank" rel="noopener noreferrer">
                            <Button><Eye className="h-4 w-4 mr-1.5" />Open PDF</Button>
                        </a>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm ── */}
            <ConfirmationDialog
                open={!!deletingId}
                onOpenChange={(o) => { if (!o) setDeletingId(null); }}
                title="Delete Minutes"
                description="This will permanently delete the document and its PDF file. This cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                variant="danger"
                loading={deleting}
            />
        </>
    );
}

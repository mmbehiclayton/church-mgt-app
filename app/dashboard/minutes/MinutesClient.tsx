"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { usePermissions } from "@/hooks/usePermissions";
import { getMinutes, deleteMinutes, type MinutesRecord } from "./actions";
import { toast } from "sonner";
import {
    FileText, Upload, Search, Trash2, Download, Eye,
    X, ChevronLeft, ChevronRight, Calendar, Tag, Clock,
    Loader2, Plus,
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
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function timeAgo(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

const TYPE_COLOURS: Record<string, string> = {
    "Board Meeting": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "Sunday Service": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "Committee Meeting": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "General Assembly": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "Prayer Meeting": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    "Youth Meeting": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
};

function typeColour(type: string): string {
    return TYPE_COLOURS[type] ?? "bg-muted text-muted-foreground";
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
        title: "",
        meetingDate: "",
        meetingType: "",
        description: "",
    });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete dialog
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Debounce search
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [searchInput]);

    // Fetch on filter/search change
    useEffect(() => {
        fetchMinutes(debouncedSearch, filterType, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, filterType]);

    function fetchMinutes(search: string, type: string, page: number) {
        startTransition(async () => {
            const result = await getMinutes({
                search: search || undefined,
                meetingType: type !== TYPE_ALL ? type : undefined,
                page,
                limit: 20,
            });
            setMinutes(result.data);
            setPagination(result.pagination);
        });
    }

    // Upload submit
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

            if (!res.ok) {
                toast.error(json.error ?? "Upload failed");
                return;
            }

            toast.success("Minutes uploaded successfully");
            setShowUpload(false);
            setUploadForm({ title: "", meetingDate: "", meetingType: "", description: "" });
            setUploadFile(null);
            fetchMinutes(debouncedSearch, filterType, 1);
        } catch {
            toast.error("Upload failed — please try again");
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete() {
        if (!deletingId) return;
        setDeleting(true);
        const result = await deleteMinutes(deletingId);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Minutes deleted");
            fetchMinutes(debouncedSearch, filterType, pagination.page);
        }
        setDeleting(false);
        setDeletingId(null);
    }

    const allTypes = Array.from(new Set([...MEETING_TYPE_OPTIONS, ...meetingTypes]));
    const hasFilters = filterType !== TYPE_ALL || searchInput;

    if (!hasPermission("minutes:read")) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">You don&apos;t have permission to view meeting minutes.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Meeting Minutes</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Upload and browse all meeting records as PDFs
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
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search title or notes…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-9 h-9"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                            >
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
                        <button
                            onClick={() => { setSearchInput(""); setFilterType(TYPE_ALL); }}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-border"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear
                        </button>
                    )}

                    {isPending && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-center">
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            Loading…
                        </div>
                    )}

                    <div className="ml-auto text-sm text-muted-foreground self-center">
                        {pagination.total} document{pagination.total !== 1 ? "s" : ""}
                    </div>
                </div>

                {/* Cards grid */}
                {minutes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 py-20 flex flex-col items-center gap-3 text-muted-foreground">
                        <FileText className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">No minutes found</p>
                        <p className="text-xs">
                            {hasFilters ? "Try adjusting your search or filter" : "Upload your first PDF to get started"}
                        </p>
                        {canUpload && !hasFilters && (
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowUpload(true)}>
                                <Upload className="h-4 w-4 mr-1.5" />
                                Upload Minutes
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {minutes.map((doc) => (
                            <div
                                key={doc.id}
                                className="group rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                            >
                                {/* Top row */}
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm leading-snug line-clamp-2">
                                            {doc.title}
                                        </p>
                                        <span className={cn("inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium", typeColour(doc.meetingType))}>
                                            {doc.meetingType}
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                {doc.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {doc.description}
                                    </p>
                                )}

                                {/* Meta */}
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        {formatDate(doc.meetingDate)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        Uploaded {timeAgo(doc.createdAt)}
                                        {doc.uploadedByName && ` by ${doc.uploadedByName}`}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Tag className="h-3.5 w-3.5 shrink-0" />
                                        {formatBytes(doc.fileSize)} PDF
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-1 mt-auto border-t border-border">
                                    <a
                                        href={`/api/minutes/${doc.id}/file`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1"
                                    >
                                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </Button>
                                    </a>
                                    <a
                                        href={`/api/minutes/${doc.id}/file`}
                                        download={doc.fileName}
                                        className="flex-1"
                                    >
                                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                                            <Download className="h-3.5 w-3.5" />
                                            Download
                                        </Button>
                                    </a>
                                    {canDelete && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeletingId(doc.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Page {pagination.page} of {pagination.pages} · {pagination.total} documents
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === 1 || isPending}
                                onClick={() => fetchMinutes(debouncedSearch, filterType, pagination.page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === pagination.pages || isPending}
                                onClick={() => fetchMinutes(debouncedSearch, filterType, pagination.page + 1)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
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
                            <Input
                                id="min-title"
                                placeholder="e.g. January Board Meeting 2025"
                                value={uploadForm.title}
                                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="min-date">Meeting Date <span className="text-destructive">*</span></Label>
                                <Input
                                    id="min-date"
                                    type="date"
                                    value={uploadForm.meetingDate}
                                    onChange={(e) => setUploadForm((f) => ({ ...f, meetingDate: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="min-type">Meeting Type <span className="text-destructive">*</span></Label>
                                <Select
                                    value={uploadForm.meetingType}
                                    onValueChange={(v) => setUploadForm((f) => ({ ...f, meetingType: v }))}
                                >
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
                            <textarea
                                id="min-desc"
                                rows={3}
                                placeholder="Brief summary of what was discussed (optional)"
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>

                        {/* File drop zone */}
                        <div
                            className={cn(
                                "rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
                                uploadFile
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const f = e.dataTransfer.files[0];
                                if (f?.type === "application/pdf") setUploadFile(f);
                                else toast.error("Only PDF files are accepted");
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setUploadFile(f);
                                }}
                            />
                            {uploadFile ? (
                                <div className="flex flex-col items-center gap-1.5">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <p className="text-sm font-medium">{uploadFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                                        className="text-xs text-muted-foreground hover:text-destructive mt-1"
                                    >
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
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading…
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-1.5" />
                                        Upload
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
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

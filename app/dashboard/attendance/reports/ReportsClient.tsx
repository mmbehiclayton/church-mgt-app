"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
    ArrowLeft,
    FileBarChart,
    Users,
    UserCheck,
    UserX,
    UserMinus,
    Percent,
    Download,
    Printer,
    FileText,
    FileSpreadsheet,
    AlertTriangle,
    Loader2,
    Phone,
    MessageSquare,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    getSessionReport,
    getComparisonReport,
    type ReportSessionListItem,
    type SessionReport,
    type SessionReportRow,
    type ComparisonReport,
} from "../attendance-actions";
import {
    exportSessionReportCsv,
    exportSessionReportExcel,
    exportSessionReportPdf,
    exportComparisonCsv,
    exportComparisonExcel,
    exportComparisonPdf,
} from "@/lib/attendance-report-export";

const TYPE_LABEL: Record<string, string> = {
    SUNDAY_SERVICE: "Sunday Service",
    MIDWEEK_SERVICE: "Midweek Service",
    EVENT: "Event",
    OTHER: "Other",
};

const STATUS_STYLES: Record<string, string> = {
    SUBMITTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const ALL = "ALL";

interface Props {
    sessions: ReportSessionListItem[];
    canSms: boolean;
}

function sessionLabel(s: ReportSessionListItem) {
    return `${TYPE_LABEL[s.type] ?? s.type} · ${format(new Date(s.date), "dd MMM yyyy")}`;
}

export default function ReportsClient({ sessions, canSms }: Props) {
    const [mode, setMode] = useState<"single" | "compare">("single");

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 print:hidden">
                <Link href="/dashboard/attendance">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                </Link>
            </div>

            <PageHeader
                title="Attendance Reports"
                description="Generate, print and export attendance reports. Compare services to spot trends."
                icon={FileBarChart}
                className="print:hidden"
            />

            {/* Mode toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted p-[3px] print:hidden">
                <button
                    onClick={() => setMode("single")}
                    className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                        mode === "single" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Single Service
                </button>
                <button
                    onClick={() => setMode("compare")}
                    className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                        mode === "compare" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Compare Services
                </button>
            </div>

            {sessions.length === 0 ? (
                <EmptyState
                    icon={FileBarChart}
                    title="No sessions yet"
                    description="Mark attendance for a service first, then come back to generate reports."
                    bordered
                />
            ) : mode === "single" ? (
                <SingleReport sessions={sessions} canSms={canSms} />
            ) : (
                <CompareReport sessions={sessions} canSms={canSms} />
            )}
        </div>
    );
}

/* ── Single service report ──────────────────────────────────────────────── */

function SingleReport({ sessions, canSms }: Props) {
    const [sessionId, setSessionId] = useState<string>(sessions[0]?.id ?? "");
    const [report, setReport] = useState<SessionReport | null>(null);
    const [loading, setLoading] = useState(false);

    const [fellowship, setFellowship] = useState(ALL);
    const [department, setDepartment] = useState(ALL);
    const [gender, setGender] = useState(ALL);

    async function load(id: string) {
        setSessionId(id);
        setLoading(true);
        const result = await getSessionReport(id);
        setLoading(false);
        if ("error" in result) {
            toast.error(result.error);
            setReport(null);
        } else {
            setReport(result);
            setFellowship(ALL);
            setDepartment(ALL);
            setGender(ALL);
        }
    }

    // Distinct filter options derived from the loaded report
    const fellowshipOptions = useMemo(
        () => report?.byFellowship.map(g => ({ key: g.key, label: g.label })) ?? [],
        [report]
    );
    const departmentOptions = useMemo(
        () => report?.byDepartment.map(g => ({ key: g.key, label: g.label })) ?? [],
        [report]
    );

    const filteredRows = useMemo(() => {
        if (!report) return [];
        return report.rows.filter(r => {
            if (fellowship !== ALL && (r.fellowshipId ?? "none") !== fellowship) return false;
            if (gender !== ALL && (r.gender || "unknown") !== gender) return false;
            if (department !== ALL) {
                const depts = r.departments.length > 0 ? r.departments : ["No Department"];
                if (!depts.includes(department)) return false;
            }
            return true;
        });
    }, [report, fellowship, department, gender]);

    const counts = useMemo(() => {
        const present = filteredRows.filter(r => r.status === "PRESENT").length;
        const absent = filteredRows.filter(r => r.status === "ABSENT").length;
        const excused = filteredRows.filter(r => r.status === "EXCUSED").length;
        const notRecorded = filteredRows.filter(r => r.status === "NOT_RECORDED").length;
        const total = filteredRows.length;
        const rate = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
        return { present, absent, excused, notRecorded, total, rate };
    }, [filteredRows]);

    const fellowshipChart = useMemo(() => {
        if (!report) return [];
        return report.byFellowship.slice(0, 8).map(g => ({
            name: g.label.length > 14 ? g.label.slice(0, 13) + "…" : g.label,
            Present: g.present,
            Absent: g.absent,
        }));
    }, [report]);

    const filtersActive = fellowship !== ALL || department !== ALL || gender !== ALL;

    // Build a report object reflecting the active filters for export
    const exportReport = useMemo<SessionReport | null>(() => {
        if (!report) return null;
        return { ...report, summary: counts };
    }, [report, counts]);

    return (
        <div className="space-y-6">
            {/* Session picker + exports */}
            <Card className="print:hidden">
                <CardContent className="p-4 flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[240px] space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Service</label>
                        <Select value={sessionId} onValueChange={load}>
                            <SelectTrigger><SelectValue placeholder="Choose a service…" /></SelectTrigger>
                            <SelectContent>
                                {sessions.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {sessionLabel(s)} — {s.present}/{s.total}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {report && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => exportReport && exportSessionReportPdf(exportReport, filteredRows)}>
                                <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportReport && exportSessionReportExcel(exportReport, filteredRows)}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportReport && exportSessionReportCsv(exportReport, filteredRows)}>
                                <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading report…
                </div>
            ) : !report ? (
                <EmptyState icon={FileBarChart} title="Select a service" description="Pick a service above to generate its report." bordered />
            ) : (
                <div className="space-y-6">
                    {/* Print header (only visible when printing) */}
                    <div className="hidden print:block mb-4">
                        <h1 className="text-xl font-bold">Attendance Report</h1>
                        <p className="text-sm">
                            {TYPE_LABEL[report.session.type] ?? report.session.type} · {format(new Date(report.session.date), "PPP")}
                            {report.session.description ? ` · ${report.session.description}` : ""}
                        </p>
                    </div>

                    {/* Session meta */}
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <Badge variant="secondary">{TYPE_LABEL[report.session.type] ?? report.session.type}</Badge>
                        <Badge variant="secondary" className={STATUS_STYLES[report.session.status]}>{report.session.status}</Badge>
                        <span className="text-sm text-muted-foreground">{format(new Date(report.session.date), "EEEE, MMM d, yyyy")}</span>
                        {report.session.description && <span className="text-sm text-muted-foreground">· {report.session.description}</span>}
                    </div>

                    {/* KPI strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <StatCard icon={UserCheck} label="Present" value={counts.present} accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
                        <StatCard icon={UserX} label="Absent" value={counts.absent} accent="text-red-600 dark:text-red-400" bg="bg-red-500/10" />
                        <StatCard icon={UserMinus} label="Excused" value={counts.excused} accent="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" />
                        <StatCard icon={Percent} label="Rate" value={`${counts.rate}%`} accent="text-blue-600 dark:text-blue-400" bg="bg-blue-500/10" />
                        <StatCard icon={Users} label={filtersActive ? "Filtered" : "Members"} value={counts.total} accent="text-violet-600 dark:text-violet-400" bg="bg-violet-500/10" />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <Select value={fellowship} onValueChange={setFellowship}>
                            <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="Fellowship" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All fellowships</SelectItem>
                                {fellowshipOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={department} onValueChange={setDepartment}>
                            <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="Department" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All departments</SelectItem>
                                {departmentOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Gender" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All genders</SelectItem>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                        </Select>
                        {filtersActive && (
                            <Button variant="ghost" size="sm" onClick={() => { setFellowship(ALL); setDepartment(ALL); setGender(ALL); }}>
                                Clear filters
                            </Button>
                        )}
                    </div>

                    {/* Fellowship chart */}
                    {fellowshipChart.length > 0 && (
                        <Card className="print:break-inside-avoid">
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-3">Present vs Absent by Fellowship</h3>
                                <div style={{ height: 280 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={fellowshipChart}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Present" fill="#10b981" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Rosters */}
                    <Tabs defaultValue="present" className="print:break-inside-avoid">
                        <TabsList className="print:hidden">
                            <TabsTrigger value="present">Present ({counts.present})</TabsTrigger>
                            <TabsTrigger value="absent">Absent ({counts.absent})</TabsTrigger>
                            <TabsTrigger value="excused">Excused ({counts.excused})</TabsTrigger>
                            <TabsTrigger value="watchlist">
                                Watchlist ({report.watchlist.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="present">
                            <RosterTable rows={filteredRows.filter(r => r.status === "PRESENT")} canSms={canSms} />
                        </TabsContent>
                        <TabsContent value="absent">
                            <RosterTable rows={filteredRows.filter(r => r.status === "ABSENT" || r.status === "NOT_RECORDED")} canSms={canSms} showStatus />
                        </TabsContent>
                        <TabsContent value="excused">
                            <RosterTable rows={filteredRows.filter(r => r.status === "EXCUSED")} canSms={canSms} />
                        </TabsContent>
                        <TabsContent value="watchlist">
                            {report.watchlist.length === 0 ? (
                                <EmptyState icon={AlertTriangle} title="No one on the watchlist" description="No members were absent in both this service and the previous one of the same type." bordered />
                            ) : (
                                <Card>
                                    <CardContent className="p-0 overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/40 text-left">
                                                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                                                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fellowship</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {report.watchlist.map((m, i) => (
                                                    <tr key={m.id}>
                                                        <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                                                        <td className="px-4 py-2.5 font-medium">{m.fullName}</td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">{m.phoneNumber || "—"}</td>
                                                        <td className="px-4 py-2.5 text-muted-foreground">{m.fellowshipName}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}

function RosterTable({ rows, canSms, showStatus }: { rows: SessionReportRow[]; canSms: boolean; showStatus?: boolean }) {
    if (rows.length === 0) {
        return <EmptyState icon={Users} title="No members" description="No members match the current filters in this category." bordered />;
    }
    const phones = rows.filter(r => r.phoneNumber).map(r => r.phoneNumber);
    return (
        <Card>
            <CardContent className="p-0">
                {canSms && phones.length > 0 && (
                    <div className="flex justify-end p-2 border-b border-border print:hidden">
                        <Link href={`/dashboard/sms/compose?phones=${encodeURIComponent(phones.join(","))}`}>
                            <Button variant="outline" size="sm">
                                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> SMS these {phones.length}
                            </Button>
                        </Link>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-left">
                                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fellowship</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Departments</th>
                                {showStatus && <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map((r, i) => (
                                <tr key={r.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{r.fullName}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{r.phoneNumber || "—"}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{r.gender || "—"}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{r.fellowshipName}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{r.departments.join(", ") || "—"}</td>
                                    {showStatus && (
                                        <td className="px-4 py-2.5">
                                            <Badge variant="secondary" className={r.status === "NOT_RECORDED" ? "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}>
                                                {r.status === "NOT_RECORDED" ? "Not recorded" : "Absent"}
                                            </Badge>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Compare services ───────────────────────────────────────────────────── */

function CompareReport({ sessions, canSms }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [comparison, setComparison] = useState<ComparisonReport | null>(null);
    const [loading, setLoading] = useState(false);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < 8) next.add(id);
            else toast.error("You can compare up to 8 services at a time");
            return next;
        });
    };

    async function run() {
        if (selected.size < 2) {
            toast.error("Select at least 2 services");
            return;
        }
        setLoading(true);
        const result = await getComparisonReport(Array.from(selected));
        setLoading(false);
        if ("error" in result) {
            toast.error(result.error);
            setComparison(null);
        } else {
            setComparison(result);
        }
    }

    const trendChart = useMemo(() => {
        if (!comparison) return [];
        return comparison.sessions.map(s => ({
            name: format(new Date(s.date), "dd MMM"),
            Present: s.present,
            Rate: s.rate,
        }));
    }, [comparison]);

    return (
        <div className="space-y-6">
            {/* Selector */}
            <Card className="print:hidden">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Select services to compare ({selected.size}/8)</h3>
                        <Button size="sm" onClick={run} disabled={selected.size < 2 || loading}>
                            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileBarChart className="h-3.5 w-3.5 mr-1.5" />}
                            Compare
                        </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
                        {sessions.map(s => (
                            <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                                <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                                <span className="flex-1 text-sm">{sessionLabel(s)}</span>
                                <Badge variant="secondary" className={STATUS_STYLES[s.status]}>{s.status}</Badge>
                                <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{s.present}/{s.total}</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {comparison && (
                <div className="space-y-6">
                    {/* Export bar */}
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <Button variant="outline" size="sm" onClick={() => exportComparisonPdf(comparison)}>
                            <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportComparisonExcel(comparison)}>
                            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportComparisonCsv(comparison)}>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                        </Button>
                    </div>

                    <div className="hidden print:block">
                        <h1 className="text-xl font-bold">Attendance Comparison</h1>
                        <p className="text-sm">{comparison.sessions.length} services · {format(new Date(), "PPP")}</p>
                    </div>

                    {/* Comparison table */}
                    <Card className="print:break-inside-avoid">
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-left">
                                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Metric</th>
                                        {comparison.sessions.map(s => (
                                            <th key={s.id} className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                                {TYPE_LABEL[s.type] ?? s.type}<br />
                                                <span className="font-normal normal-case">{format(new Date(s.date), "dd MMM yyyy")}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <CompareRow label="Present" values={comparison.sessions.map(s => s.present)} />
                                    <CompareRow label="Absent" values={comparison.sessions.map(s => s.absent)} />
                                    <CompareRow label="Excused" values={comparison.sessions.map(s => s.excused)} />
                                    <CompareRow label="Total" values={comparison.sessions.map(s => s.total)} />
                                    <CompareRow label="Rate" values={comparison.sessions.map(s => `${s.rate}%`)} />
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Trend chart */}
                    <Card className="print:break-inside-avoid">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-semibold mb-3">Present count & attendance rate</h3>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendChart}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="Present" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="Rate" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Consistency lists */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <ConsistencyList
                            title="Missed all services"
                            icon={UserX}
                            tone="text-red-600 dark:text-red-400"
                            members={comparison.consistentlyAbsent}
                            canSms={canSms}
                            emptyText="Everyone showed up at least once."
                        />
                        <ConsistencyList
                            title="Present at all services"
                            icon={UserCheck}
                            tone="text-emerald-600 dark:text-emerald-400"
                            members={comparison.consistentlyPresent}
                            canSms={false}
                            emptyText="No member attended every selected service."
                        />
                    </div>
                </div>
            )}

            {!comparison && !loading && (
                <EmptyState icon={FileBarChart} title="Compare services" description="Select 2 or more services above and click Compare to see side-by-side analytics." bordered />
            )}
        </div>
    );
}

function CompareRow({ label, values }: { label: string; values: (string | number)[] }) {
    return (
        <tr className="hover:bg-muted/30">
            <td className="px-4 py-2.5 font-medium">{label}</td>
            {values.map((v, i) => (
                <td key={i} className="px-4 py-2.5 tabular-nums">{v}</td>
            ))}
        </tr>
    );
}

function ConsistencyList({
    title, icon: Icon, tone, members, canSms, emptyText,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    members: { id: string; fullName: string; phoneNumber: string; fellowshipName: string }[];
    canSms: boolean;
    emptyText: string;
}) {
    const phones = members.filter(m => m.phoneNumber).map(m => m.phoneNumber);
    return (
        <Card className="print:break-inside-avoid">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className={cn("text-sm font-semibold flex items-center gap-2", tone)}>
                        <Icon className="h-4 w-4" /> {title} <span className="text-muted-foreground font-normal">({members.length})</span>
                    </h3>
                    {canSms && phones.length > 0 && (
                        <Link href={`/dashboard/sms/compose?phones=${encodeURIComponent(phones.join(","))}`} className="print:hidden">
                            <Button variant="outline" size="sm"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> SMS {phones.length}</Button>
                        </Link>
                    )}
                </div>
                {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <ul className="divide-y divide-border max-h-72 overflow-y-auto print:max-h-none print:overflow-visible">
                        {members.map(m => (
                            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                                <div className="min-w-0">
                                    <div className="font-medium truncate">{m.fullName}</div>
                                    <div className="text-xs text-muted-foreground truncate">{m.fellowshipName}</div>
                                </div>
                                {m.phoneNumber && (
                                    <a href={`tel:${m.phoneNumber}`} className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 ml-2">
                                        <Phone className="h-3 w-3" /> {m.phoneNumber}
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Small KPI card ─────────────────────────────────────────────────────── */

function StatCard({
    icon: Icon, label, value, accent, bg,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    accent: string;
    bg: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 print:break-inside-avoid">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", bg, accent)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
            </div>
        </div>
    );
}

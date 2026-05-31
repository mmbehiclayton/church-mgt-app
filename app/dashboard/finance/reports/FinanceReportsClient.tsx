"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
    ArrowLeft,
    FileBarChart,
    Wallet,
    Receipt,
    TrendingUp,
    Award,
    Download,
    Printer,
    FileText,
    FileSpreadsheet,
    Loader2,
    X,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    getCategoryContributionReport,
    type CategoryContributionReport,
    type FinanceReportBranding,
} from "@/app/actions";
import {
    exportFinanceReportCsv,
    exportFinanceReportExcel,
    exportFinanceReportPdf,
    loadLogo,
    type LoadedLogo,
} from "@/lib/finance-report-export";

interface CategoryOption {
    id: string;
    name: string;
    isActive: boolean;
}

interface Props {
    categories: CategoryOption[];
    branding: FinanceReportBranding;
    generatedBy?: string;
}

const ksh = (n: number) => `Ksh ${Math.round(n).toLocaleString()}`;

export default function FinanceReportsClient({ categories, branding, generatedBy }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [depth, setDepth] = useState<"executive" | "detailed">("executive");
    const [report, setReport] = useState<CategoryContributionReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [logo, setLogo] = useState<LoadedLogo | null>(null);

    useEffect(() => {
        let active = true;
        loadLogo(branding.logoUrl).then(l => { if (active) setLogo(l); });
        return () => { active = false; };
    }, [branding.logoUrl]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    async function generate() {
        setLoading(true);
        const result = await getCategoryContributionReport({
            categoryIds: selected.size > 0 ? Array.from(selected) : undefined,
            startDate: from ? new Date(from) : undefined,
            endDate: to ? (() => { const d = new Date(to); d.setHours(23, 59, 59, 999); return d; })() : undefined,
        });
        setLoading(false);
        if ("error" in result) { toast.error(result.error); setReport(null); }
        else setReport(result);
    }

    const detailed = depth === "detailed";

    const trendChart = useMemo(
        () => report?.monthlyTrend.map(m => ({
            name: format(new Date(`${m.month}-01T00:00:00`), "MMM yy"),
            Total: Math.round(m.total),
        })) ?? [],
        [report]
    );
    const categoryChart = useMemo(
        () => report?.categories.slice(0, 10).map(c => ({
            name: c.name.length > 12 ? c.name.slice(0, 11) + "…" : c.name,
            Total: Math.round(c.total),
        })) ?? [],
        [report]
    );

    const topCategory = report?.categories[0] ?? null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 print:hidden">
                <Link href="/dashboard/finance">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                </Link>
            </div>

            <PageHeader
                title="Contribution Reports"
                description="Analyse giving by category — single, several, or all categories — at an executive or detailed level."
                icon={FileBarChart}
                className="print:hidden"
            />

            {/* Builder */}
            <Card className="print:hidden">
                <CardContent className="p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Categories */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Categories {selected.size === 0 ? "(all)" : `(${selected.size})`}
                                </label>
                                {selected.size > 0 && (
                                    <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                                        <X className="h-3 w-3" /> Clear (use all)
                                    </button>
                                )}
                            </div>
                            <div className="max-h-44 overflow-y-auto rounded-md border border-border divide-y divide-border">
                                {categories.map(c => (
                                    <label key={c.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted/40 cursor-pointer text-sm">
                                        <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                                        <span className="flex-1">{c.name}</span>
                                        {!c.isActive && <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px]">Inactive</Badge>}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Period + depth */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">From</label>
                                    <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">To</label>
                                    <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Report depth</label>
                                <div className="inline-flex rounded-lg border border-border bg-muted p-[3px] w-full">
                                    {([["executive", "Executive"], ["detailed", "Detailed"]] as const).map(([v, l]) => (
                                        <button
                                            key={v}
                                            onClick={() => setDepth(v)}
                                            className={cn(
                                                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                                                depth === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    {detailed ? "Includes every transaction grouped by category." : "High-level totals, shares and trends."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={generate} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileBarChart className="h-4 w-4 mr-1.5" />}
                            Generate Report
                        </Button>
                        {report && (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => exportFinanceReportPdf(report, branding, logo, generatedBy, detailed)}>
                                    <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => exportFinanceReportExcel(report, branding, logo, generatedBy, detailed)}>
                                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => exportFinanceReportCsv(report, branding, generatedBy, detailed)}>
                                    <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating report…
                </div>
            ) : !report ? (
                <EmptyState icon={FileBarChart} title="Build a contribution report" description="Pick categories (or leave empty for all), an optional period and depth, then Generate." bordered />
            ) : (
                <div className="space-y-6">
                    {/* Print letterhead */}
                    <PrintHeader branding={branding} />
                    <div className="hidden print:block mb-2">
                        <h1 className="text-lg font-bold">Contribution Report — {report.scope}</h1>
                        <p className="text-sm">{periodText(report)}</p>
                    </div>

                    {/* Scope meta */}
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <Badge variant="secondary">{report.scope}</Badge>
                        <span className="text-sm text-muted-foreground">{periodText(report)}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">{detailed ? "Detailed" : "Executive"}</Badge>
                    </div>

                    {/* KPI strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={Wallet} label="Total Contributions" value={ksh(report.grandTotal)} accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
                        <StatCard icon={Receipt} label="Transactions" value={report.grandCount.toLocaleString()} accent="text-blue-600 dark:text-blue-400" bg="bg-blue-500/10" />
                        <StatCard icon={TrendingUp} label="Average" value={ksh(report.grandAvg)} accent="text-violet-600 dark:text-violet-400" bg="bg-violet-500/10" />
                        <StatCard icon={Award} label="Top Category" value={topCategory ? topCategory.name : "—"} sub={topCategory ? `${topCategory.share}% · ${ksh(topCategory.total)}` : undefined} accent="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" />
                    </div>

                    {/* Charts */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        {categoryChart.length > 0 && (
                            <Card className="print:break-inside-avoid">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-3">Contributions by category</h3>
                                    <div style={{ height: 280 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={categoryChart} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={56} tick={{ fontSize: 11 }} tickLine={false} />
                                                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                                                <Tooltip formatter={(v: number | undefined) => [ksh(v ?? 0), "Total"]} />
                                                <Bar dataKey="Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {trendChart.length > 0 && (
                            <Card className="print:break-inside-avoid">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-3">Monthly trend</h3>
                                    <div style={{ height: 280 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendChart}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                                                <Tooltip formatter={(v: number | undefined) => [ksh(v ?? 0), "Total"]} />
                                                <Line type="monotone" dataKey="Total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Category summary table */}
                    <Card className="print:break-inside-avoid">
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-left">
                                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Total</th>
                                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Txns</th>
                                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Average</th>
                                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {report.categories.map(c => (
                                        <tr key={c.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                                                {c.name}
                                                {!c.isActive && <span className="ml-2 text-[10px] text-muted-foreground">(inactive)</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-semibold">{ksh(c.total)}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">{c.count}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{ksh(c.avg)}</td>
                                            <td className="px-4 py-2.5 w-40">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, c.share)}%` }} />
                                                    </div>
                                                    <span className="text-xs tabular-nums w-10 text-right">{c.share}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                                        <td className="px-4 py-2.5">Total</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{ksh(report.grandTotal)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{report.grandCount}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{ksh(report.grandAvg)}</td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">100%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Detailed transactions grouped by category */}
                    {detailed && (
                        <DetailedTransactions report={report} />
                    )}
                </div>
            )}
        </div>
    );
}

function periodText(report: CategoryContributionReport) {
    const { from, to } = report.period;
    if (from && to) return `${format(new Date(from), "PPP")} – ${format(new Date(to), "PPP")}`;
    if (from) return `From ${format(new Date(from), "PPP")}`;
    if (to) return `Until ${format(new Date(to), "PPP")}`;
    return "All time";
}

function DetailedTransactions({ report }: { report: CategoryContributionReport }) {
    const grouped = useMemo(() => {
        const map = new Map<string, CategoryContributionReport["transactions"]>();
        for (const t of report.transactions) {
            const list = map.get(t.categoryName) ?? [];
            list.push(t);
            map.set(t.categoryName, list);
        }
        return Array.from(map.entries());
    }, [report]);

    if (grouped.length === 0) {
        return <EmptyState icon={Receipt} title="No transactions" description="No transactions match the selected categories and period." bordered />;
    }

    return (
        <div className="space-y-4">
            {grouped.map(([catName, list]) => {
                const subtotal = list.reduce((s, t) => s + t.amount, 0);
                return (
                    <Card key={catName} className="print:break-inside-avoid">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                                <h3 className="text-sm font-semibold">{catName}</h3>
                                <span className="text-sm text-muted-foreground">{ksh(subtotal)} · {list.length} txns</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/20 text-left">
                                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference</th>
                                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                                            <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {list.map((t, i) => (
                                            <tr key={`${t.reference}-${i}`} className="hover:bg-muted/30">
                                                <td className="px-4 py-2 whitespace-nowrap">{format(new Date(t.date), "dd MMM yyyy")}</td>
                                                <td className="px-4 py-2 font-mono text-xs">{t.reference}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{t.memberName || "—"}</td>
                                                <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">{ksh(t.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function PrintHeader({ branding }: { branding: FinanceReportBranding }) {
    const contacts = [
        branding.leaderName ? `Led by ${branding.leaderName}` : null,
        branding.phone,
        branding.email,
    ].filter(Boolean).join("  ·  ");
    return (
        <div className="hidden print:flex items-center gap-4 border-b border-black/20 pb-3 mb-4">
            {branding.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-16 w-16 object-contain" />
            )}
            <div>
                <div className="text-xl font-bold">{branding.name}</div>
                {contacts && <div className="text-xs">{contacts}</div>}
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon, label, value, sub, accent, bg,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    sub?: string;
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
                <p className="text-lg font-bold tabular-nums leading-tight truncate">{value}</p>
                {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
            </div>
        </div>
    );
}

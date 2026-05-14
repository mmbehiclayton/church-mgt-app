"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Filter,
  Activity,
  ChevronRight,
  Trash2,
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import { deleteAttendanceSession } from "./attendance-actions";
import type { AttendanceOverview } from "./attendance-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const TYPE_LABEL: Record<string, string> = {
  SUNDAY_SERVICE: "Sunday Service",
  MIDWEEK_SERVICE: "Midweek Service",
  EVENT: "Event",
  OTHER: "Other",
};

const TYPE_COLOR: Record<string, string> = {
  SUNDAY_SERVICE: "bg-blue-500",
  MIDWEEK_SERVICE: "bg-sky-500",
  EVENT: "bg-violet-500",
  OTHER: "bg-slate-500",
};

interface Props {
  overview: AttendanceOverview;
  canCreate: boolean;
  canManage?: boolean;
}

export default function AttendanceDashboardClient({ overview, canCreate, canManage }: Props) {
  const {
    totalMembers,
    latestSession,
    attendanceRate,
    presentDelta,
    activeMembers,
    watchlistCount,
    trend,
    typeMix,
    fellowshipBreakdown,
    recentSessions,
  } = overview;

  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const filteredSessions = useMemo(
    () => (typeFilter === "ALL" ? recentSessions : recentSessions.filter(s => s.type === typeFilter)),
    [recentSessions, typeFilter]
  );

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteSession = async () => {
    if (!deletingSessionId) return;
    setDeleteLoading(true);
    const result = await deleteAttendanceSession(deletingSessionId);
    setDeleteLoading(false);
    setDeletingSessionId(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Session deleted");
      router.refresh();
    }
  };

  const trendChartData = useMemo(
    () =>
      trend.map(t => ({
        date: format(new Date(t.date), "MMM d"),
        Present: t.present,
        Absent: t.absent,
      })),
    [trend]
  );

  const typeChartData = useMemo(
    () =>
      typeMix.map(t => ({
        name: TYPE_LABEL[t.type] ?? t.type,
        Sessions: t.sessions,
        Attendance: t.attendance,
      })),
    [typeMix]
  );

  const activeRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Attendance"
        description="Sunday services, midweek meetings, events — at a glance."
        icon={Calendar}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/attendance/watchlist">
              <Button variant="outline">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Watchlist
                {watchlistCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
                    {watchlistCount}
                  </Badge>
                )}
              </Button>
            </Link>
            {canCreate && (
              <Link href="/dashboard/attendance/mark">
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Mark Attendance
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Last Service"
          value={latestSession ? latestSession.present.toString() : "—"}
          sublabel={
            latestSession
              ? `${TYPE_LABEL[latestSession.type]} · ${format(new Date(latestSession.date), "MMM d")}`
              : "No services recorded"
          }
          icon={Users}
          accent="blue"
          delta={latestSession ? presentDelta : null}
        />
        <KpiCard
          label="Attendance Rate"
          value={latestSession ? `${attendanceRate}%` : "—"}
          sublabel={
            latestSession
              ? `${latestSession.present} of ${totalMembers} members`
              : "No data yet"
          }
          icon={Activity}
          accent="emerald"
          progress={attendanceRate}
        />
        <KpiCard
          label="Active Members"
          value={activeMembers.toLocaleString()}
          sublabel={`${activeRate}% engaged in last 4 Sundays`}
          icon={CheckCircle2}
          accent="sky"
          progress={activeRate}
        />
        <KpiCard
          label="Watchlist"
          value={watchlistCount.toString()}
          sublabel="Absent 2 Sundays in a row"
          icon={AlertTriangle}
          accent={watchlistCount > 0 ? "amber" : "emerald"}
          href="/dashboard/attendance/watchlist"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sunday Attendance Trend</CardTitle>
              <span className="text-xs text-muted-foreground">Last 12 Sundays</span>
            </div>
          </CardHeader>
          <CardContent>
            {trendChartData.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Not enough Sunday data"
                description="Submit a few Sunday services and the trend chart will populate."
              />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="Present"
                      stroke="oklch(0.55 0.21 270)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Absent"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 90 days · by type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeChartData.length === 0 ? (
              <EmptyState icon={Calendar} title="No recent sessions" description="Submitted sessions in the last 90 days will appear here." />
            ) : (
              <div className="space-y-3">
                {typeChartData.map(row => {
                  const original = typeMix.find(t => (TYPE_LABEL[t.type] ?? t.type) === row.name);
                  const dot = TYPE_COLOR[original?.type ?? ""] ?? "bg-slate-500";
                  return (
                    <div key={row.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
                          <span className="font-medium">{row.name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {row.Sessions} session{row.Sessions === 1 ? "" : "s"} · {row.Attendance.toLocaleString()} attended
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fellowship breakdown */}
      {fellowshipBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Attendance by Fellowship — Last Service</CardTitle>
              <span className="text-xs text-muted-foreground">Top 8</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fellowshipBreakdown.map(f => ({
                  name: f.name,
                  Present: f.present,
                  Missing: Math.max(0, f.members - f.present),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="Present" stackId="a" fill="oklch(0.55 0.21 270)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Missing" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmationDialog
        open={!!deletingSessionId}
        onOpenChange={open => { if (!open) setDeletingSessionId(null); }}
        title="Delete attendance session?"
        description="This will permanently remove the session and all its attendance records. This cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteSession}
      />

      {/* Sessions list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs rounded-md border border-input bg-background"
                >
                  <option value="ALL">All types</option>
                  <option value="SUNDAY_SERVICE">Sunday Service</option>
                  <option value="MIDWEEK_SERVICE">Midweek</option>
                  <option value="EVENT">Event</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No sessions match"
              description={
                typeFilter === "ALL"
                  ? "Mark your first session to get started."
                  : "Try a different type filter."
              }
              action={
                canCreate && typeFilter === "ALL" ? (
                  <Link href="/dashboard/attendance/mark">
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5 mr-2" /> Mark Attendance
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {filteredSessions.map(s => {
                const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group">
                    <Link
                      href={`/dashboard/attendance/mark?id=${s.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", TYPE_COLOR[s.type] ?? "bg-slate-500", "text-white")}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {format(new Date(s.date), "EEEE, MMM d, yyyy")}
                          </span>
                          <Badge variant="secondary" className={STATUS_STYLES[s.status] || ""}>
                            {s.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {TYPE_LABEL[s.type] ?? s.type}
                          {s.description ? ` · ${s.description}` : ""}
                          <span className="ml-2">
                            · {formatDistanceToNowStrict(new Date(s.date), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block w-32">
                        <div className="text-sm font-semibold tabular-nums">
                          {s.present} / {s.total}
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{rate}% present</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeletingSessionId(s.id)}
                        aria-label="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "blue" | "emerald" | "sky" | "amber";
  delta?: number | null;
  progress?: number;
  href?: string;
}

const ACCENTS: Record<KpiCardProps["accent"], { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
};

function KpiCard({ label, value, sublabel, icon: Icon, accent, delta, progress, href }: KpiCardProps) {
  const accentCls = ACCENTS[accent];
  const inner = (
    <Card className="card-lift h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </div>
            <div className="text-3xl font-bold tracking-tight mt-1.5 tabular-nums">{value}</div>
          </div>
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", accentCls.bg, accentCls.text)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
          <span className="truncate">{sublabel}</span>
          {typeof delta === "number" && delta !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                delta > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </div>

        {typeof progress === "number" && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all", accentCls.bg.replace("/10", ""))}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {href && (
          <div className="mt-3 text-xs text-primary inline-flex items-center">
            View details <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

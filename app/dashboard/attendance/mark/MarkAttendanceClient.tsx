"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarIcon,
  Search,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Save,
  Send,
  Users,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createAttendanceSession,
  updateAttendanceSession,
  upsertAttendanceRecords,
} from "@/app/actions";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";
type AttendanceType = "SUNDAY_SERVICE" | "MIDWEEK_SERVICE" | "EVENT" | "OTHER";

interface Member {
  id: string;
  fullName: string;
  gender: string;
  homeFellowshipId: string | null;
  homeFellowshipName: string | null;
  departmentIds: string[];
}

interface Option {
  id: string;
  name: string;
}

interface SessionData {
  id: string;
  date: string;
  type: string;
  description: string;
  status: string;
  records: { memberId: string; status: string }[];
}

interface Props {
  members: Member[];
  departments: Option[];
  fellowships: Option[];
  session: SessionData | null;
}

const TYPE_LABEL: Record<string, string> = {
  SUNDAY_SERVICE: "Sunday Service",
  MIDWEEK_SERVICE: "Midweek Service",
  EVENT: "Event",
  OTHER: "Other",
};

export default function MarkAttendanceClient({ members, departments, fellowships, session }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const editing = !!session;

  // Step state
  const [step, setStep] = useState<1 | 2>(editing ? 2 : 1);

  // Session details
  const [date, setDate] = useState<Date>(session ? new Date(session.date) : new Date());
  const [type, setType] = useState<AttendanceType>((session?.type as AttendanceType) || "SUNDAY_SERVICE");
  const [description, setDescription] = useState(session?.description || "");

  // Attendance map
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    if (!session) return {};
    const map: Record<string, AttendanceStatus> = {};
    for (const r of session.records) map[r.memberId] = r.status as AttendanceStatus;
    return map;
  });

  // Filters
  const [search, setSearch] = useState("");
  const [filterFellowship, setFilterFellowship] = useState<string>("ALL");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (search && !m.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterFellowship !== "ALL") {
        if (filterFellowship === "NONE" && m.homeFellowshipId) return false;
        if (filterFellowship !== "NONE" && m.homeFellowshipId !== filterFellowship) return false;
      }
      if (filterDept !== "ALL" && !m.departmentIds.includes(filterDept)) return false;
      if (filterStatus !== "ALL") {
        const status = attendance[m.id] || "UNMARKED";
        if (filterStatus === "UNMARKED" && attendance[m.id]) return false;
        if (filterStatus !== "UNMARKED" && status !== filterStatus) return false;
      }
      return true;
    });
  }, [members, search, filterFellowship, filterDept, filterStatus, attendance]);

  // Group filtered members by fellowship for visual sections
  const groupedMembers = useMemo(() => {
    const groups = new Map<string, { name: string; members: Member[] }>();
    for (const m of filteredMembers) {
      const key = m.homeFellowshipId ?? "__none";
      const name = m.homeFellowshipName ?? "Unassigned";
      if (!groups.has(key)) groups.set(key, { name, members: [] });
      groups.get(key)!.members.push(m);
    }
    return Array.from(groups.entries()).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  }, [filteredMembers]);

  function setStatus(memberId: string, status: AttendanceStatus | undefined) {
    setAttendance(prev => {
      const next = { ...prev };
      if (status === undefined) delete next[memberId];
      else next[memberId] = status;
      return next;
    });
  }

  function bulkSet(ids: string[], status: AttendanceStatus) {
    setAttendance(prev => {
      const next = { ...prev };
      for (const id of ids) next[id] = status;
      return next;
    });
  }

  function clearAll() {
    setAttendance({});
  }

  // Counts
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    for (const m of members) {
      const s = attendance[m.id];
      if (s === "PRESENT") present++;
      else if (s === "ABSENT") absent++;
      else if (s === "EXCUSED") excused++;
    }
    return {
      present,
      absent,
      excused,
      unmarked: members.length - present - absent - excused,
      total: members.length,
    };
  }, [attendance, members]);

  const visibleIds = filteredMembers.map(m => m.id);

  async function save(submitStatus: "DRAFT" | "SUBMITTED") {
    startTransition(async () => {
      try {
        let sessionId = session?.id;
        if (sessionId) {
          const res = await updateAttendanceSession(sessionId, {
            date,
            type,
            description,
            status: submitStatus,
          });
          if (res.error) throw new Error(res.error);
        } else {
          const res = await createAttendanceSession({ date, type, description });
          if (res.error || !res.session) throw new Error(res.error || "Failed to create session");
          sessionId = res.session.id;
          if (submitStatus === "SUBMITTED") {
            await updateAttendanceSession(sessionId, { status: "SUBMITTED" });
          }
        }

        // Default unmarked → ABSENT only at submit time
        const records = members.map(m => ({
          memberId: m.id,
          status: attendance[m.id] || (submitStatus === "SUBMITTED" ? "ABSENT" : "ABSENT"),
        }));

        const result = await upsertAttendanceRecords(sessionId, records);
        if (result.error) throw new Error(result.error);

        toast.success(
          submitStatus === "SUBMITTED"
            ? "Attendance submitted successfully"
            : "Saved as draft"
        );
        router.push("/dashboard/attendance");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {editing ? "Edit Attendance" : "Mark Attendance"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? `Editing ${TYPE_LABEL[session!.type]} · ${format(new Date(session!.date), "MMM d, yyyy")}`
              : "Capture roll call for a service or event."}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
        <StepDot active={step === 1} done={step > 1} label="Details" n={1} onClick={() => setStep(1)} />
        <div className="flex-1 h-px bg-border" />
        <StepDot active={step === 2} done={false} label="Roll Call" n={2} onClick={() => step === 2 ? null : null} />
      </div>

      {step === 1 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-base">Session details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEEE, MMMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={type} onValueChange={v => setType(v as AttendanceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUNDAY_SERVICE">Sunday Service</SelectItem>
                  <SelectItem value="MIDWEEK_SERVICE">Midweek Service</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Special guest speaker, baptism Sunday, etc."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} size="lg">
                Continue to Roll Call <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatPill label="Present" value={counts.present} color="emerald" />
            <StatPill label="Absent" value={counts.absent} color="red" />
            <StatPill label="Excused" value={counts.excused} color="amber" />
            <StatPill label="Unmarked" value={counts.unmarked} color="slate" />
          </div>

          {/* Toolbar */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterFellowship} onValueChange={setFilterFellowship}>
                  <SelectTrigger className="w-auto min-w-[140px]">
                    <SelectValue placeholder="All fellowships" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All fellowships</SelectItem>
                    <SelectItem value="NONE">Unassigned</SelectItem>
                    {fellowships.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="w-auto min-w-[140px]">
                    <SelectValue placeholder="All depts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All departments</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-auto min-w-[120px]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All status</SelectItem>
                    <SelectItem value="UNMARKED">Unmarked</SelectItem>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="EXCUSED">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground self-center mr-1">Bulk:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkSet(visibleIds, "PRESENT")}
                  disabled={visibleIds.length === 0}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  Mark visible Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkSet(visibleIds, "ABSENT")}
                  disabled={visibleIds.length === 0}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-600" />
                  Mark visible Absent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkSet(members.map(m => m.id), "PRESENT")}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  All Present
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Members list grouped by fellowship */}
          <Card>
            <CardContent className="p-0">
              {filteredMembers.length === 0 ? (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  No members match your filters.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {groupedMembers.map(([key, group]) => {
                    const collapsed = collapsedGroups.has(key);
                    const groupIds = group.members.map(m => m.id);
                    const presentInGroup = group.members.filter(m => attendance[m.id] === "PRESENT").length;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between p-3 bg-muted/40">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              })
                            }
                            className="flex items-center gap-2 font-medium text-sm hover:text-primary"
                          >
                            {collapsed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {group.name}
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              {presentInGroup}/{group.members.length}
                            </Badge>
                          </button>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => bulkSet(groupIds, "PRESENT")}
                            >
                              All P
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => bulkSet(groupIds, "ABSENT")}
                            >
                              All A
                            </Button>
                          </div>
                        </div>
                        {!collapsed && (
                          <div className="divide-y divide-border">
                            {group.members.map(m => {
                              const s = attendance[m.id];
                              return (
                                <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                    {m.fullName
                                      .split(" ")
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map(p => p[0])
                                      .join("")
                                      .toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{m.fullName}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {m.gender}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <StatusButton
                                      active={s === "PRESENT"}
                                      onClick={() =>
                                        setStatus(m.id, s === "PRESENT" ? undefined : "PRESENT")
                                      }
                                      label="P"
                                      colorClass="data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:border-emerald-600"
                                      icon={CheckCircle2}
                                    />
                                    <StatusButton
                                      active={s === "ABSENT"}
                                      onClick={() =>
                                        setStatus(m.id, s === "ABSENT" ? undefined : "ABSENT")
                                      }
                                      label="A"
                                      colorClass="data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600"
                                      icon={XCircle}
                                    />
                                    <StatusButton
                                      active={s === "EXCUSED"}
                                      onClick={() =>
                                        setStatus(m.id, s === "EXCUSED" ? undefined : "EXCUSED")
                                      }
                                      label="E"
                                      colorClass="data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500"
                                      icon={MinusCircle}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer actions */}
          <div className="sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground flex items-center gap-3">
              <span className="hidden sm:inline">
                <Keyboard className="h-3.5 w-3.5 inline mr-1" />
                Click P/A/E to mark status. Unmarked → Absent at submit.
              </span>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={isPending}>
                Back
              </Button>
              <Button variant="outline" onClick={() => save("DRAFT")} disabled={isPending}>
                <Save className="h-4 w-4 mr-2" /> Save draft
              </Button>
              <Button onClick={() => save("SUBMITTED")} disabled={isPending}>
                <Send className="h-4 w-4 mr-2" />
                {isPending ? "Submitting…" : "Submit attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
  n,
  onClick,
}: {
  active: boolean;
  done: boolean;
  label: string;
  n: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 group"
      aria-current={active ? "step" : undefined}
    >
      <span
        className={cn(
          "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
          active
            ? "bg-primary border-primary text-primary-foreground"
            : done
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "bg-card border-border text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
      </span>
      <span
        className={cn(
          "text-xs font-medium hidden sm:inline",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "red" | "amber" | "slate";
}) {
  const styles = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  }[color];
  return (
    <div className={cn("rounded-lg p-3", styles)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function StatusButton({
  active,
  onClick,
  label,
  colorClass,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  colorClass: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        "h-8 w-8 sm:w-auto sm:px-2.5 rounded-md border border-input bg-background text-xs font-semibold transition-colors flex items-center justify-center gap-1 hover:bg-muted",
        colorClass
      )}
      aria-pressed={active}
      aria-label={`${label === "P" ? "Present" : label === "A" ? "Absent" : "Excused"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

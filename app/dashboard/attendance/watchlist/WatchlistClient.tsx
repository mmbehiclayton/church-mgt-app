"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  UserX,
  Search,
  MessageSquare,
  Phone,
  CheckCircle2,
  Filter,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";

interface WatchlistMember {
  id: string;
  fullName: string;
  phoneNumber: string;
  homeFellowship: { id: string; name: string } | null;
  consecutiveAbsences: number;
  lastAttended: string | null;
}

interface Props {
  members: WatchlistMember[];
  canSms: boolean;
}

export default function WatchlistClient({ members, canSms }: Props) {
  const [search, setSearch] = useState("");
  const [fellowshipFilter, setFellowshipFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fellowships = useMemo(() => {
    const set = new Map<string, string>();
    for (const m of members) {
      if (m.homeFellowship) set.set(m.homeFellowship.id, m.homeFellowship.name);
    }
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter(m => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.fullName.toLowerCase().includes(q) &&
          !m.phoneNumber.toLowerCase().includes(q) &&
          !(m.homeFellowship?.name.toLowerCase().includes(q))
        )
          return false;
      }
      if (fellowshipFilter !== "ALL") {
        if (fellowshipFilter === "NONE" && m.homeFellowship) return false;
        if (fellowshipFilter !== "NONE" && m.homeFellowship?.id !== fellowshipFilter) return false;
      }
      return true;
    });
  }, [members, search, fellowshipFilter]);

  const toggleAll = (v: boolean) => {
    if (v) setSelected(new Set(filtered.map(m => m.id)));
    else setSelected(new Set());
  };

  function exportCsv() {
    const rows = [
      ["Name", "Phone", "Fellowship", "Last Attended", "Consecutive Absences"],
      ...filtered.map(m => [
        m.fullName,
        m.phoneNumber,
        m.homeFellowship?.name || "",
        m.lastAttended ? format(new Date(m.lastAttended), "yyyy-MM-dd") : "Never recorded",
        String(m.consecutiveAbsences),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watchlist-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Attendance Watchlist"
        description="Members who missed the last 2 consecutive Sunday services. Follow up to re-engage."
        icon={UserX}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5 mr-2" /> Export CSV
            </Button>
            {canSms && filtered.length > 0 && (
              <Link
                href={`/dashboard/sms/compose?phones=${encodeURIComponent(
                  filtered.map(m => m.phoneNumber).join(",")
                )}`}
              >
                <Button size="sm">
                  <MessageSquare className="h-3.5 w-3.5 mr-2" /> Send SMS to {filtered.length}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              On Watchlist
            </div>
            <div className="text-3xl font-bold tabular-nums mt-1.5">{members.length}</div>
            <div className="text-xs text-muted-foreground mt-1">2+ consecutive absences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              With Contact Info
            </div>
            <div className="text-3xl font-bold tabular-nums mt-1.5">
              {members.filter(m => m.phoneNumber && m.phoneNumber.trim().length > 0).length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Reachable by SMS</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Selected
            </div>
            <div className="text-3xl font-bold tabular-nums mt-1.5">{selected.size}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {selected.size === 0 ? "Select members to act on" : "Ready for follow-up"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or fellowship..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={fellowshipFilter}
                onChange={e => setFellowshipFilter(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                <option value="ALL">All fellowships</option>
                <option value="NONE">Unassigned</option>
                {fellowships.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            {filtered.length > 0 && (
              <label className="flex items-center gap-2 ml-auto text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={selected.size > 0 && selected.size === filtered.length}
                  onCheckedChange={v => toggleAll(Boolean(v))}
                />
                Select all visible
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member cards */}
      {members.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All clear"
          description="No members have missed the last 2 consecutive Sunday services. Keep up the good shepherding!"
          bordered
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No members match"
          description="Try adjusting the search or fellowship filter."
          bordered
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => {
            const isSelected = selected.has(m.id);
            const initials = m.fullName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map(p => p[0])
              .join("")
              .toUpperCase();
            return (
              <Card
                key={m.id}
                className={`card-lift ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={v => {
                        setSelected(prev => {
                          const next = new Set(prev);
                          if (v) next.add(m.id);
                          else next.delete(m.id);
                          return next;
                        });
                      }}
                      className="mt-1"
                    />
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{m.fullName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.homeFellowship?.name || "No fellowship"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                      {m.consecutiveAbsences} weeks absent
                    </Badge>
                    {m.lastAttended ? (
                      <span className="text-[11px] text-muted-foreground">
                        Last seen {formatDistanceToNowStrict(new Date(m.lastAttended), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No prior attendance recorded</span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    {m.phoneNumber ? (
                      <a
                        href={`tel:${m.phoneNumber}`}
                        className="flex-1 text-xs flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-input hover:bg-muted transition-colors text-foreground"
                        aria-label={`Call ${m.fullName}`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {m.phoneNumber}
                      </a>
                    ) : (
                      <div className="flex-1 text-xs text-center py-1.5 rounded-md border border-dashed border-border text-muted-foreground">
                        No phone
                      </div>
                    )}
                    {canSms && m.phoneNumber && (
                      <Link
                        href={`/dashboard/sms/compose?phones=${encodeURIComponent(m.phoneNumber)}`}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> SMS
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky bulk action bar when selected */}
      {selected.size > 0 && canSms && (
        <div className="sticky bottom-4 z-20 mx-auto max-w-md">
          <div className="rounded-xl bg-card border border-border shadow-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm">
              <strong>{selected.size}</strong> selected
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Link
                href={`/dashboard/sms/compose?phones=${encodeURIComponent(
                  filtered
                    .filter(m => selected.has(m.id) && m.phoneNumber)
                    .map(m => m.phoneNumber)
                    .join(",")
                )}`}
              >
                <Button size="sm">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> SMS selected
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

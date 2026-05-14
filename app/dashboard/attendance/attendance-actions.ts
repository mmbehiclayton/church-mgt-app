"use server";

import prisma from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export interface AttendanceOverview {
  totalMembers: number;
  latestSession: {
    id: string;
    date: Date;
    type: string;
    status: string;
    present: number;
    absent: number;
    excused: number;
  } | null;
  previousSession: {
    present: number;
  } | null;
  /** % of members present last service */
  attendanceRate: number;
  /** Delta in present count vs the prior service of the same type */
  presentDelta: number;
  /** Members who attended at least once in the last 4 Sundays */
  activeMembers: number;
  /** Members on the 2-consecutive-absence watchlist */
  watchlistCount: number;
  /** 12 most recent submitted Sunday-service trend points */
  trend: { date: string; present: number; absent: number }[];
  /** Service-type mix over the last 90 days (count of sessions) */
  typeMix: { type: string; sessions: number; attendance: number }[];
  /** Top fellowships by present count in the latest session */
  fellowshipBreakdown: {
    fellowshipId: string | null;
    name: string;
    present: number;
    members: number;
  }[];
  /** Recent sessions (any status) for the list view */
  recentSessions: {
    id: string;
    date: Date;
    type: string;
    status: string;
    description: string | null;
    present: number;
    total: number;
  }[];
}

/**
 * One-shot aggregator for the attendance dashboard. Returns everything the
 * overview page needs in a single round trip.
 */
export async function getAttendanceOverview(): Promise<AttendanceOverview> {
  await requirePermission("attendance", "read");

  const totalMembers = await prisma.member.count();

  // Last 12 submitted Sunday sessions for the trend
  const submittedSundays = await prisma.attendanceSession.findMany({
    where: { type: "SUNDAY_SERVICE", status: "SUBMITTED" },
    orderBy: { date: "desc" },
    take: 12,
    include: { records: { select: { status: true } } },
  });

  const trend = submittedSundays
    .map(s => ({
      date: s.date.toISOString().slice(0, 10),
      present: s.records.filter(r => r.status === "PRESENT").length,
      absent: s.records.filter(r => r.status === "ABSENT").length,
    }))
    .reverse();

  // Latest service overall (any type) for the headline stats
  const latestSessionFull = await prisma.attendanceSession.findFirst({
    orderBy: { date: "desc" },
    include: {
      records: {
        select: { status: true, member: { select: { homeFellowshipId: true } } },
      },
    },
  });

  let latestSession: AttendanceOverview["latestSession"] = null;
  let previousSession: AttendanceOverview["previousSession"] = null;
  let presentDelta = 0;

  if (latestSessionFull) {
    const present = latestSessionFull.records.filter(r => r.status === "PRESENT").length;
    const absent = latestSessionFull.records.filter(r => r.status === "ABSENT").length;
    const excused = latestSessionFull.records.filter(r => r.status === "EXCUSED").length;
    latestSession = {
      id: latestSessionFull.id,
      date: latestSessionFull.date,
      type: latestSessionFull.type,
      status: latestSessionFull.status,
      present,
      absent,
      excused,
    };

    // Previous session of the same type for the delta
    const prev = await prisma.attendanceSession.findFirst({
      where: {
        type: latestSessionFull.type,
        id: { not: latestSessionFull.id },
        date: { lte: latestSessionFull.date },
      },
      orderBy: { date: "desc" },
      include: { records: { where: { status: "PRESENT" }, select: { id: true } } },
    });
    if (prev) {
      previousSession = { present: prev.records.length };
      presentDelta = present - prev.records.length;
    }
  }

  const attendanceRate =
    latestSession && totalMembers > 0
      ? Math.round((latestSession.present / totalMembers) * 1000) / 10
      : 0;

  // Active members: distinct memberIds with PRESENT in last 4 Sunday sessions
  const lastFourSundays = await prisma.attendanceSession.findMany({
    where: { type: "SUNDAY_SERVICE", status: "SUBMITTED" },
    orderBy: { date: "desc" },
    take: 4,
    select: { id: true },
  });
  let activeMembers = 0;
  if (lastFourSundays.length > 0) {
    const rows = await prisma.attendanceRecord.findMany({
      where: {
        sessionId: { in: lastFourSundays.map(s => s.id) },
        status: "PRESENT",
      },
      select: { memberId: true },
      distinct: ["memberId"],
    });
    activeMembers = rows.length;
  }

  // Watchlist: absent in BOTH of the last 2 Sundays
  let watchlistCount = 0;
  if (lastFourSundays.length >= 2) {
    const lastTwo = lastFourSundays.slice(0, 2).map(s => s.id);
    const absentees = await prisma.attendanceRecord.groupBy({
      by: ["memberId"],
      where: { sessionId: { in: lastTwo }, status: "ABSENT" },
      _count: { memberId: true },
      having: { memberId: { _count: { equals: 2 } } },
    });
    watchlistCount = absentees.length;
  }

  // Service-type mix over last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const typeAgg = await prisma.attendanceSession.groupBy({
    by: ["type"],
    where: { date: { gte: since }, status: "SUBMITTED" },
    _count: { id: true },
  });
  // Get attendance per type — separate query (group nested aggregations aren't elegant in Prisma)
  const typeMix = await Promise.all(
    typeAgg.map(async row => {
      const records = await prisma.attendanceRecord.count({
        where: {
          status: "PRESENT",
          session: { type: row.type, date: { gte: since }, status: "SUBMITTED" },
        },
      });
      return { type: row.type, sessions: row._count.id, attendance: records };
    })
  );

  // Fellowship breakdown for the latest session
  let fellowshipBreakdown: AttendanceOverview["fellowshipBreakdown"] = [];
  if (latestSessionFull) {
    const presentByFellowship = new Map<string | null, number>();
    for (const r of latestSessionFull.records) {
      if (r.status !== "PRESENT") continue;
      const key = r.member.homeFellowshipId;
      presentByFellowship.set(key, (presentByFellowship.get(key) ?? 0) + 1);
    }
    const fellowships = await prisma.homeFellowship.findMany({
      select: { id: true, name: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
    fellowshipBreakdown = fellowships.map(f => ({
      fellowshipId: f.id,
      name: f.name,
      present: presentByFellowship.get(f.id) ?? 0,
      members: f._count.members,
    }));
    // Include unassigned bucket if any
    const unassigned = presentByFellowship.get(null) ?? 0;
    if (unassigned > 0) {
      fellowshipBreakdown.push({
        fellowshipId: null,
        name: "Unassigned",
        present: unassigned,
        members: 0,
      });
    }
    // Sort by present desc and keep top 8
    fellowshipBreakdown = fellowshipBreakdown
      .sort((a, b) => b.present - a.present)
      .slice(0, 8);
  }

  // Recent sessions list
  const recent = await prisma.attendanceSession.findMany({
    orderBy: { date: "desc" },
    take: 10,
    include: { records: { select: { status: true } } },
  });
  const recentSessions = recent.map(s => ({
    id: s.id,
    date: s.date,
    type: s.type,
    status: s.status,
    description: s.description,
    present: s.records.filter(r => r.status === "PRESENT").length,
    total: s.records.length,
  }));

  return {
    totalMembers,
    latestSession,
    previousSession,
    attendanceRate,
    presentDelta,
    activeMembers,
    watchlistCount,
    trend,
    typeMix,
    fellowshipBreakdown,
    recentSessions,
  };
}

/**
 * Enriched watchlist: members absent in the last 2 Sundays, with their
 * last-attended date and contact info so admins can follow up.
 */
export interface WatchlistMember {
  id: string;
  fullName: string;
  phoneNumber: string;
  homeFellowship: { id: string; name: string } | null;
  consecutiveAbsences: number;
  lastAttended: Date | null;
}

export async function getWatchlist(): Promise<WatchlistMember[]> {
  await requirePermission("attendance", "read");

  const lastFour = await prisma.attendanceSession.findMany({
    where: { type: "SUNDAY_SERVICE", status: "SUBMITTED" },
    orderBy: { date: "desc" },
    take: 4,
    select: { id: true, date: true },
  });
  if (lastFour.length < 2) return [];

  const last2 = lastFour.slice(0, 2);
  const last2Ids = last2.map(s => s.id);

  // Members absent in BOTH last sessions
  const absentees = await prisma.attendanceRecord.groupBy({
    by: ["memberId"],
    where: { sessionId: { in: last2Ids }, status: "ABSENT" },
    _count: { memberId: true },
    having: { memberId: { _count: { equals: 2 } } },
  });
  if (absentees.length === 0) return [];

  const memberIds = absentees.map(a => a.memberId);
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      homeFellowship: { select: { id: true, name: true } },
    },
  });

  // Last attended for each
  const lastAttendedRows = await prisma.attendanceRecord.findMany({
    where: { memberId: { in: memberIds }, status: "PRESENT" },
    orderBy: [{ session: { date: "desc" } }],
    select: { memberId: true, session: { select: { date: true } } },
    distinct: ["memberId"],
  });
  const lastAttendedMap = new Map<string, Date>();
  for (const r of lastAttendedRows) lastAttendedMap.set(r.memberId, r.session.date);

  // Count exact consecutive absences from the most recent session backward
  const consecutiveAbsences = 2; // we already filtered to exactly 2-in-2; could deepen analysis later

  return members.map(m => ({
    id: m.id,
    fullName: m.fullName,
    phoneNumber: m.phoneNumber,
    homeFellowship: m.homeFellowship,
    consecutiveAbsences,
    lastAttended: lastAttendedMap.get(m.id) ?? null,
  }));
}

export async function deleteAttendanceSession(id: string): Promise<{ success?: boolean; error?: string }> {
  await requirePermission("attendance", "manage");
  try {
    // Cascade deletes AttendanceRecords via schema relation
    await prisma.attendanceSession.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteAttendanceSession]", err);
    return { error: "Failed to delete session" };
  }
}


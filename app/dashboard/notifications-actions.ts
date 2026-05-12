"use server";

import prisma from "@/lib/db";
import { hasPermission } from "@/lib/rbac";

export interface RecentActivity {
  id: string;
  kind: "sms" | "attendance";
  title: string;
  subtitle: string;
  at: Date;
  href: string;
}

/**
 * Aggregate a short feed of recent activity across modules the user can see.
 * Returns up to 10 items, newest first.
 */
export async function getRecentActivity(): Promise<RecentActivity[]> {
  const [canSms, canAttendance] = await Promise.all([
    hasPermission("sms", "read"),
    hasPermission("attendance", "read"),
  ]);

  const items: RecentActivity[] = [];

  if (canSms) {
    const campaigns = await prisma.smsCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        message: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        createdAt: true,
      },
    });
    for (const c of campaigns) {
      items.push({
        id: `sms-${c.id}`,
        kind: "sms",
        title: c.name || c.message.slice(0, 48),
        subtitle: `${c.status} · ${c.sentCount}/${c.totalRecipients} sent`,
        at: c.createdAt,
        href: `/dashboard/sms/history/${c.id}`,
      });
    }
  }

  if (canAttendance) {
    const sessions = await prisma.attendanceSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        date: true,
        type: true,
        status: true,
        createdAt: true,
        _count: { select: { records: true } },
      },
    });
    for (const s of sessions) {
      items.push({
        id: `att-${s.id}`,
        kind: "attendance",
        title: `${s.type.replace("_", " ")} attendance`,
        subtitle: `${s.status} · ${s._count.records} records`,
        at: s.createdAt,
        href: `/dashboard/attendance`,
      });
    }
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
}

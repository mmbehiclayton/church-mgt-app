import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";
import DashboardLanding from "@/components/dashboard/DashboardLanding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Pull the current user's name live from the DB so profile edits show up
    // immediately, not just after a fresh sign-in (the JWT caches it).
    const userId = session?.user?.id as string | undefined;
    const liveUser = userId
        ? await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, email: true },
          })
        : null;

    // Build access map in one pass
    const [
        canFinance,
        canMembers,
        canAttendance,
        canSms,
        canMinutes,
        canUsers,
        canRbac,
        canSettings,
    ] = await Promise.all([
        hasPermission("transactions", "read"),
        hasPermission("members", "read"),
        hasPermission("attendance", "read"),
        hasPermission("sms", "read"),
        hasPermission("minutes", "read"),
        hasPermission("users", "read"),
        hasPermission("rbac", "manage"),
        hasPermission("settings", "read"),
    ]);

    // Light-touch stats — only query what user can see
    const [memberCount, latestSession, recentCampaign] = await Promise.all([
        canMembers ? prisma.member.count() : Promise.resolve(0),
        canAttendance
            ? prisma.attendanceSession.findFirst({
                  orderBy: { date: "desc" },
                  select: {
                      id: true,
                      date: true,
                      type: true,
                      status: true,
                      _count: { select: { records: true } },
                  },
              })
            : Promise.resolve(null),
        canSms
            ? prisma.smsCampaign.findFirst({
                  orderBy: { createdAt: "desc" },
                  select: {
                      id: true,
                      name: true,
                      message: true,
                      status: true,
                      totalRecipients: true,
                      sentCount: true,
                      createdAt: true,
                  },
              })
            : Promise.resolve(null),
    ]);

    const userName =
        liveUser?.name?.trim() ||
        session?.user?.name?.trim() ||
        liveUser?.email?.split("@")[0] ||
        session?.user?.email?.split("@")[0] ||
        null;

    return (
        <DashboardLanding
            userName={userName}
            access={{
                finance: canFinance,
                members: canMembers,
                attendance: canAttendance,
                sms: canSms,
                minutes: canMinutes,
                users: canUsers,
                rbac: canRbac,
                settings: canSettings,
            }}
            stats={{ memberCount, latestSession, recentCampaign }}
        />
    );
}

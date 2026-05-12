import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";
import DashboardLanding from "@/components/dashboard/DashboardLanding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Build access map in one pass
    const [
        canFinance,
        canMembers,
        canAttendance,
        canSms,
        canUsers,
        canRbac,
        canSettings,
    ] = await Promise.all([
        hasPermission("transactions", "read"),
        hasPermission("members", "read"),
        hasPermission("attendance", "read"),
        hasPermission("sms", "read"),
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

    return (
        <DashboardLanding
            userName={session?.user?.name || session?.user?.email?.split("@")[0] || null}
            access={{
                finance: canFinance,
                members: canMembers,
                attendance: canAttendance,
                sms: canSms,
                users: canUsers,
                rbac: canRbac,
                settings: canSettings,
            }}
            stats={{ memberCount, latestSession, recentCampaign }}
        />
    );
}

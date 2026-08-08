import { hasPermission } from "@/lib/rbac";
import { getReportSessionsList, getReportBranding } from "../attendance-actions";
import ReportsClient from "./ReportsClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AccessDenied } from "@/components/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function AttendanceReportsPage() {
    const canRead = await hasPermission("attendance", "read");
    if (!canRead) {
        return (
            <div className="flex items-center justify-center h-64">
                <AccessDenied description="You don't have permission to view attendance." />
            </div>
        );
    }

    const [sessions, branding, canSms, session] = await Promise.all([
        getReportSessionsList(),
        getReportBranding(),
        hasPermission("sms", "create"),
        getServerSession(authOptions),
    ]);
    const generatedBy = session?.user?.name || session?.user?.email || undefined;
    return <ReportsClient sessions={sessions} branding={branding} canSms={canSms} generatedBy={generatedBy} />;
}

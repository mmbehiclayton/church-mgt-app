import { hasPermission } from "@/lib/rbac";
import { getReportSessionsList, getReportBranding } from "../attendance-actions";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function AttendanceReportsPage() {
    const canRead = await hasPermission("attendance", "read");
    if (!canRead) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                        You don&apos;t have permission to view attendance.
                    </p>
                </div>
            </div>
        );
    }

    const [sessions, branding, canSms] = await Promise.all([
        getReportSessionsList(),
        getReportBranding(),
        hasPermission("sms", "create"),
    ]);
    return <ReportsClient sessions={sessions} branding={branding} canSms={canSms} />;
}

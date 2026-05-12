import { hasPermission } from "@/lib/rbac";
import { getAttendanceOverview } from "./attendance-actions";
import AttendanceDashboardClient from "./AttendanceDashboardClient";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
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

  const overview = await getAttendanceOverview();
  const canCreate = await hasPermission("attendance", "create");
  return <AttendanceDashboardClient overview={overview} canCreate={canCreate} />;
}

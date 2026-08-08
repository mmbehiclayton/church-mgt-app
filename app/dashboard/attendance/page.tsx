import { hasPermission } from "@/lib/rbac";
import { getAttendanceOverview } from "./attendance-actions";
import AttendanceDashboardClient from "./AttendanceDashboardClient";
import { AccessDenied } from "@/components/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const canRead = await hasPermission("attendance", "read");
  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <AccessDenied description="You don't have permission to view attendance." />
      </div>
    );
  }

  const overview = await getAttendanceOverview();
  const canCreate = await hasPermission("attendance", "create");
  const canManage = await hasPermission("attendance", "manage");
  return <AttendanceDashboardClient overview={overview} canCreate={canCreate} canManage={canManage} />;
}

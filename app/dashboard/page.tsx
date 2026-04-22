import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
    const routes = await Promise.all([
        hasPermission("transactions", "read").then((allowed) => allowed ? "/dashboard/finance" : null),
        hasPermission("members", "read").then((allowed) => allowed ? "/dashboard/membership" : null),
        hasPermission("attendance", "read").then((allowed) => allowed ? "/dashboard/attendance" : null),
        hasPermission("users", "read").then((allowed) => allowed ? "/dashboard/users" : null),
        hasPermission("settings", "read").then((allowed) => allowed ? "/dashboard/settings/organization" : null),
        hasPermission("rbac", "manage").then((allowed) => allowed ? "/dashboard/rbac" : null),
    ]);

    const firstAccessibleRoute = routes.find(Boolean);
    if (firstAccessibleRoute) {
        redirect(firstAccessibleRoute);
    }

    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">No Accessible Modules</h2>
                <p className="text-gray-500 mt-2">Your account does not currently have access to any dashboard modules.</p>
            </div>
        </div>
    );
}

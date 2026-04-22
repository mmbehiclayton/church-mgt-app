"use client";

import UsersTable from "@/components/users/UsersTable";
import { usePermissions } from "@/hooks/usePermissions";
import type { UserManagementUser } from "@/types/users";

interface UsersPageClientProps {
    users: UserManagementUser[];
}

export default function UsersPageClient({ users }: UsersPageClientProps) {
    const { hasPermission } = usePermissions();

    if (!hasPermission('users:read')) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                    <p className="text-gray-500 mt-2">You don&apos;t have permission to view users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage user accounts, roles, and permissions</p>
                </div>
            </div>

            <UsersTable users={users} />
        </div>
    );
}

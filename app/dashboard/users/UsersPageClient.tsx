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
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">You don&apos;t have permission to view users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage user accounts, roles, and permissions</p>
            </div>
            <UsersTable users={users} />
        </div>
    );
}

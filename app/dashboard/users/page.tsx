import { getUsers } from "@/app/actions";
import UsersTable from "@/components/users/UsersTable";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getUsers();

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

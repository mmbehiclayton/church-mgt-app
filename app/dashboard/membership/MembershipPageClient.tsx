"use client";

import MembersTable from "@/components/membership/MembersTable";
import { usePermissions } from "@/hooks/usePermissions";

interface HomeFellowship {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
    description: string | null;
    _count: { members: number };
}

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    estate: string | null;
    homeFellowshipId: string | null;
    homeFellowship: HomeFellowship | null;
    departments: { department: { id: string; name: string } }[];
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

interface MembershipPageClientProps {
    members: Member[];
    pagination: Pagination;
    departments: Department[];
    homeFellowships: HomeFellowship[];
}

export default function MembershipPageClient({
    members,
    pagination,
    departments,
    homeFellowships,
}: MembershipPageClientProps) {
    const { hasPermission } = usePermissions();

    if (!hasPermission("members:read")) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                        You don&apos;t have permission to view members.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Membership</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage church members, departments, and fellowships
                </p>
            </div>

            <MembersTable
                members={members}
                pagination={pagination}
                departments={departments}
                homeFellowships={homeFellowships}
            />
        </div>
    );
}

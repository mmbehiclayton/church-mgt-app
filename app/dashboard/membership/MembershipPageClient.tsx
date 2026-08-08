"use client";

import MembersTable from "@/components/membership/MembersTable";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/access-denied";

interface HomeFellowship { id: string; name: string; }
interface Department { id: string; name: string; description: string | null; _count: { members: number }; }
interface AccountabilityGroup { id: string; name: string; description: string | null; leaders: { member: { id: string; fullName: string; phoneNumber: string } }[]; _count: { members: number }; }

interface Member {
    id: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    estate: string | null;
    status: string | null;
    dateJoined: Date | string | null;
    homeFellowshipId: string | null;
    homeFellowship: HomeFellowship | null;
    accountabilityGroupId: string | null;
    accountabilityGroup: { id: string; name: string } | null;
    departments: { department: { id: string; name: string } }[];
}

interface Pagination { total: number; page: number; limit: number; pages: number; }

interface MembershipPageClientProps {
    members: Member[];
    pagination: Pagination;
    departments: Department[];
    homeFellowships: HomeFellowship[];
    accountabilityGroups: AccountabilityGroup[];
}

export default function MembershipPageClient({ members, pagination, departments, homeFellowships, accountabilityGroups }: MembershipPageClientProps) {
    const { hasPermission } = usePermissions();

    if (!hasPermission("members:read")) {
        return (
            <div className="flex items-center justify-center h-64">
                <AccessDenied description="You don't have permission to view members." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Membership</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage church members, departments, fellowships and accountability groups
                </p>
            </div>

            <MembersTable
                members={members}
                pagination={pagination}
                departments={departments}
                homeFellowships={homeFellowships}
                accountabilityGroups={accountabilityGroups}
            />
        </div>
    );
}

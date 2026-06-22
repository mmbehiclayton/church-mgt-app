import { getMembers, getDepartments, getHomeFellowships, getAccountabilityGroups } from "@/app/actions";
import MembershipPageClient from "./MembershipPageClient";

export const dynamic = 'force-dynamic';

export default async function MembershipPage() {
    const [membersResult, departments, homeFellowships, accountabilityGroups] = await Promise.all([
        getMembers({ page: 1, limit: 50 }),
        getDepartments(),
        getHomeFellowships(),
        getAccountabilityGroups(),
    ]);

    return (
        <MembershipPageClient
            members={membersResult.data as Parameters<typeof MembershipPageClient>[0]["members"]}
            pagination={membersResult.pagination}
            departments={departments}
            homeFellowships={homeFellowships}
            accountabilityGroups={accountabilityGroups}
        />
    );
}

import { getMembers, getDepartments, getHomeFellowships } from "@/app/actions";
import MembershipPageClient from "./MembershipPageClient";

export const dynamic = 'force-dynamic';

export default async function MembershipPage() {
    const [membersResult, departments, homeFellowships] = await Promise.all([
        getMembers({ page: 1, limit: 50 }),
        getDepartments(),
        getHomeFellowships()
    ]);

    return (
        <MembershipPageClient
            members={membersResult.data}
            pagination={membersResult.pagination}
            departments={departments}
            homeFellowships={homeFellowships}
        />
    );
}

import { getMembers, getDepartments, getHomeFellowships } from "@/app/actions";
import MembersTable from "@/components/membership/MembersTable";

export const dynamic = 'force-dynamic';

export default async function MembershipPage() {
    const [members, departments, homeFellowships] = await Promise.all([
        getMembers(),
        getDepartments(),
        getHomeFellowships()
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Membership</h1>
                    <p className="text-gray-500 mt-1">Manage church members and departments</p>
                </div>
            </div>

            <MembersTable members={members} departments={departments} homeFellowships={homeFellowships} />
        </div>
    );
}

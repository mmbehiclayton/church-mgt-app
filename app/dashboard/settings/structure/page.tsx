import { getDepartments, getHomeFellowships } from "@/app/actions";
import StructureManager from "@/components/settings/StructureManager";

export const dynamic = 'force-dynamic';

export default async function StructureSettingsPage() {
    const departments = await getDepartments();
    const fellowships = await getHomeFellowships();

    return (
        <div className="space-y-6 px-4 md:px-0 mt-6 md:mt-0">
            <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Church Structure</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Manage organizational departments and home fellowships.</p>
            </div>
            <StructureManager departments={departments} fellowships={fellowships} />
        </div>
    );
}

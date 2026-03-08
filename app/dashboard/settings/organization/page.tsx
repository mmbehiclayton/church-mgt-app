import { getOrganization } from "@/app/actions";
import SettingsForm from "@/components/settings/SettingsForm";

export const dynamic = 'force-dynamic';

export default async function OrganizationSettingsPage() {
    const organization = await getOrganization();

    if (!organization) {
        return <div>Failed to load organization settings.</div>;
    }

    return (
        <div className="space-y-6 px-4 md:px-0 mt-6 md:mt-0">
            <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Organization Settings</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Manage your general information and logo.</p>
            </div>
            <SettingsForm organization={organization} />
        </div>
    );
}

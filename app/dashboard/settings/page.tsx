import { getOrganization } from "@/app/actions";
import SettingsForm from "@/components/settings/SettingsForm";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const organization = await getOrganization();

    if (!organization) {
        return <div>Failed to load organization settings.</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
            <SettingsForm organization={organization} />
        </div>
    );
}

import { getOrganization } from "@/app/actions";
import OrganizationSettingsPageClient from "./OrganizationSettingsPageClient";

export const dynamic = 'force-dynamic';

export default async function OrganizationSettingsPage() {
    const organization = await getOrganization();

    if (!organization) {
        return <div>Failed to load organization settings.</div>;
    }

    return <OrganizationSettingsPageClient organization={organization} />;
}

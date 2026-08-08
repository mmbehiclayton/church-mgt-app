"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/access-denied";
import SettingsForm from "@/components/settings/SettingsForm";

interface Organization {
    id: string;
    name: string;
    leaderName: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
}

interface OrganizationSettingsPageClientProps {
    organization: Organization;
}

export default function OrganizationSettingsPageClient({ organization }: OrganizationSettingsPageClientProps) {
    const { hasPermission } = usePermissions();

    if (!hasPermission('settings:read')) {
        return (
            <div className="flex items-center justify-center h-64">
                <AccessDenied description="You don't have permission to view settings." />
            </div>
        );
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
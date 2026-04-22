"use client";

import { usePermissions } from "@/hooks/usePermissions";
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
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                    <p className="text-gray-500 mt-2">You don&apos;t have permission to view settings.</p>
                </div>
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
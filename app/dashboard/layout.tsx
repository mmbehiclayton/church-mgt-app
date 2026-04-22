import DashboardClientLayout from "@/components/layout/DashboardClientLayout";
import { getOrganization } from "@/app/actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/');
    }

    const canReadSettings = await hasPermission("settings", "read");
    const organization = canReadSettings ? await getOrganization() : null;

    return (
        <DashboardClientLayout organization={organization}>
            {children}
        </DashboardClientLayout>
    );
}

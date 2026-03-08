import DashboardClientLayout from "@/components/layout/DashboardClientLayout";
import { getOrganization } from "@/app/actions";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const organization = await getOrganization();

    <DashboardClientLayout organization={organization}>
        {children}
    </DashboardClientLayout>
}

import DashboardClientLayout from "@/components/layout/DashboardClientLayout";
import { getOrganization } from "@/app/actions";
import { ToastProvider } from "@/components/ui/toast";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const organization = await getOrganization();

    return (
        <ToastProvider>
            <DashboardClientLayout organization={organization}>
                {children}
            </DashboardClientLayout>
        </ToastProvider>
    );
}

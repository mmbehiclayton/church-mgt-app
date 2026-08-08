import { hasPermission } from "@/lib/rbac";
import { getCategories, getFinanceReportBranding } from "@/app/actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Wallet } from "lucide-react";
import { AccessDenied } from "@/components/ui/access-denied";
import FinanceReportsClient from "./FinanceReportsClient";

export const dynamic = "force-dynamic";

export default async function FinanceReportsPage() {
    const canRead = await hasPermission("transactions", "read");
    if (!canRead) {
        return (
            <div className="flex items-center justify-center h-64">
                <AccessDenied icon={Wallet} description="You don't have permission to view finance data." />
            </div>
        );
    }

    const [categories, branding, session] = await Promise.all([
        getCategories(),
        getFinanceReportBranding(),
        getServerSession(authOptions),
    ]);
    const generatedBy = session?.user?.name || session?.user?.email || undefined;

    return (
        <FinanceReportsClient
            categories={categories.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))}
            branding={branding}
            generatedBy={generatedBy}
        />
    );
}

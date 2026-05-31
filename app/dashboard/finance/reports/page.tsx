import { hasPermission } from "@/lib/rbac";
import { getCategories, getFinanceReportBranding } from "@/app/actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Wallet } from "lucide-react";
import FinanceReportsClient from "./FinanceReportsClient";

export const dynamic = "force-dynamic";

export default async function FinanceReportsPage() {
    const canRead = await hasPermission("transactions", "read");
    if (!canRead) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold">Access Denied</h2>
                    <p className="text-sm text-muted-foreground">You don&apos;t have permission to view finance data.</p>
                </div>
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

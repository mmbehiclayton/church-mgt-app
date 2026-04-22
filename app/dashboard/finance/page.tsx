import { getCategories, getTransactions, getDashboardStats } from "@/app/actions";
import TransactionModal from "@/components/finance/TransactionModal";
import CategoryModal from "@/components/finance/CategoryModal";
import TransactionsTable from "@/components/TransactionsTable";
import ExportButtons from "@/components/ExportButtons";
import ImportButton from "@/components/ImportButton";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KPIGrid from "@/components/dashboard/KPIGrid";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import CollapsibleSection from "@/components/dashboard/CollapsibleSection";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/rbac";
import { Menu } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        from?: string;
        to?: string;
        categories?: string;
    }
}

export default async function FinanceDashboardPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const startDate = searchParams.from ? new Date(searchParams.from) : undefined;
    const endDate = searchParams.to ? new Date(searchParams.to) : undefined;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    const categoryIds = searchParams.categories ? searchParams.categories.split(",") : undefined;

    const filters = { startDate, endDate, categoryIds };
    const [
        canReadTransactions,
        canReadCategories,
        canCreateTransactions,
        canManageCategories,
        canExportReports,
    ] = await Promise.all([
        hasPermission("transactions", "read"),
        hasPermission("categories", "read"),
        hasPermission("transactions", "create"),
        hasPermission("categories", "manage"),
        hasPermission("reports", "export"),
    ]);

    if (!canReadTransactions) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                    <p className="text-gray-500 mt-2">You don&apos;t have permission to view finance data.</p>
                </div>
            </div>
        );
    }

    const [categories, transactions, stats] = await Promise.all([
        canReadCategories ? getCategories() : [],
        getTransactions(filters),
        getDashboardStats(filters)
    ]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Finance Overview</h2>

                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {canCreateTransactions && (
                                    <TransactionModal categories={categories} asMenuItem />
                                )}
                                {canManageCategories && (
                                    <CategoryModal initialCategories={categories} asMenuItem />
                                )}
                                {(canCreateTransactions || canManageCategories) && <DropdownMenuSeparator />}
                                {canCreateTransactions && <ImportButton asMenuItem />}
                                {canExportReports && <ExportButtons categories={categories} asMenuItem />}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="hidden md:flex gap-2 flex-wrap">
                    {canCreateTransactions && <TransactionModal categories={categories} />}
                    {canManageCategories && <CategoryModal initialCategories={categories} />}
                    {canCreateTransactions && <ImportButton />}
                    {canExportReports && <ExportButtons categories={categories} />}
                </div>
            </div>

            <DashboardFilters categories={categories} />

            <CollapsibleSection title="Key Metrics" defaultOpen={true}>
                <div className="p-4">
                    <KPIGrid
                        totalRevenue={stats.totalAmount}
                        transactionCount={stats.totalTransactions}
                        avgTransaction={stats.avgTransaction}
                        topCategory={stats.topCategory}
                    />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Analytics" defaultOpen={true}>
                <div className="p-4">
                    <AnalyticsCharts
                        revenueTrend={stats.revenueTrend}
                        categoryStats={stats.categoryBreakdown}
                    />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Recent Transactions" defaultOpen={true}>
                <CardContent className="p-0">
                    <TransactionsTable transactions={transactions} categories={categories} />
                </CardContent>
            </CollapsibleSection>
        </div>
    );
}

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

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: {
        from?: string;
        to?: string;
        categories?: string;
    }
}

export default async function DashboardPage(props: PageProps) {
    const searchParams = await props.searchParams;
    // Parse Filters
    const startDate = searchParams.from ? new Date(searchParams.from) : undefined;
    const endDate = searchParams.to ? new Date(searchParams.to) : undefined;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    const categoryIds = searchParams.categories ? searchParams.categories.split(",") : undefined;

    const filters = { startDate, endDate, categoryIds };

    // Fetch Data
    const [categories, transactions, stats] = await Promise.all([
        getCategories(),
        getTransactions(filters), // Reuse basic filter for list
        getDashboardStats(filters)
    ]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Finance Overview</h2>
                <div className="flex gap-2 flex-wrap">
                    <TransactionModal categories={categories} />
                    <CategoryModal initialCategories={categories} />
                    <ImportButton />
                    <ExportButtons categories={categories} />
                </div>
            </div>

            {/* Global Filters */}
            <DashboardFilters categories={categories} />

            {/* KPI Grid */}
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

            {/* Analytics Charts */}
            <CollapsibleSection title="Analytics" defaultOpen={true}>
                <div className="p-4">
                    <AnalyticsCharts
                        revenueTrend={stats.revenueTrend}
                        categoryStats={stats.categoryBreakdown}
                    />
                </div>
            </CollapsibleSection>

            {/* Recent Transactions List */}
            <CollapsibleSection title="Recent Transactions" defaultOpen={true}>
                <CardContent className="p-0">
                    <TransactionsTable transactions={transactions} />
                </CardContent>
            </CollapsibleSection>
        </div>
    );
}

import { getCategories, getTransactions, getDashboardStats, getFinanceReportBranding } from "@/app/actions";
import TransactionModal from "@/components/finance/TransactionModal";
import CategoryModal from "@/components/finance/CategoryModal";
import TransactionsTable from "@/components/TransactionsTable";
import ExportButtons from "@/components/ExportButtons";
import ImportButton from "@/components/ImportButton";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KPIGrid from "@/components/dashboard/KPIGrid";
import CategorySummary from "@/components/dashboard/CategorySummary";
import { hasPermission } from "@/lib/rbac";
import { Menu, Wallet, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<{ from?: string; to?: string; categories?: string; ref?: string }>;
}

export default async function FinanceDashboardPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const startDate = sp.from ? new Date(sp.from) : undefined;
    const endDate = sp.to ? new Date(sp.to) : undefined;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    const categoryIds = sp.categories ? sp.categories.split(",") : undefined;
    const ref = sp.ref?.trim() || undefined;
    const filters = { startDate, endDate, categoryIds, ref };

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

    const [allCategories, activeCategories, transactions, stats, branding] = await Promise.all([
        canReadCategories ? getCategories() : Promise.resolve([]),
        canReadCategories ? getCategories({ activeOnly: true }) : Promise.resolve([]),
        getTransactions(filters),
        getDashboardStats(filters),
        canExportReports ? getFinanceReportBranding() : Promise.resolve(undefined),
    ]);

    // Categories / Import / Export live in the secondary actions menu (New Transaction is now standalone).
    const hasSecondaryActions = canManageCategories || canCreateTransactions || canExportReports;

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Contributions, transactions and category breakdown.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Secondary actions: Categories / Import / Export */}
                    {hasSecondaryActions && (
                        <>
                            {/* Mobile actions menu */}
                            <div className="md:hidden">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {canManageCategories && <CategoryModal initialCategories={allCategories} asMenuItem />}
                                        {canCreateTransactions && <ImportButton asMenuItem />}
                                        {canExportReports && <ExportButtons categories={activeCategories} branding={branding} asMenuItem />}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Desktop secondary buttons */}
                            <div className="hidden md:flex gap-2 flex-wrap">
                                {canManageCategories && <CategoryModal initialCategories={allCategories} />}
                                {canCreateTransactions && <ImportButton />}
                                {canExportReports && <ExportButtons categories={activeCategories} branding={branding} />}
                            </div>
                        </>
                    )}

                    {/* Primary action — standalone, before Reports */}
                    {canCreateTransactions && <TransactionModal categories={activeCategories} />}

                    <Link href="/dashboard/finance/reports">
                        <Button variant="outline" size="sm">
                            <FileBarChart className="h-4 w-4 mr-1.5" />
                            Reports
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <DashboardFilters categories={activeCategories} />

            {/* KPI strip */}
            <KPIGrid
                totalRevenue={stats.totalAmount}
                transactionCount={stats.totalTransactions}
                avgTransaction={stats.avgTransaction}
                topCategory={stats.topCategory}
            />

            {/* Charts */}
            <CategorySummary categoryStats={stats.categoryBreakdown} />

            {/* Transactions table */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Transactions
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                            Reconciled
                        </span>
                        <span className="text-xs text-muted-foreground">{transactions.length} records</span>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <TransactionsTable transactions={transactions} categories={activeCategories} />
                </div>
            </div>
        </div>
    );
}

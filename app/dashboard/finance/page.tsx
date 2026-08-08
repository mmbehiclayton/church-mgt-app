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
import { AccessDenied } from "@/components/ui/access-denied";
import { Menu, Wallet, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
                <AccessDenied icon={Wallet} description="You don't have permission to view finance data." />
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

    // Categories / Import live in the secondary actions menu; Reports moves into that
    // same menu on mobile so the header row stays short, but stays a standalone button
    // on desktop. New Transaction + Download are always the standalone primary actions.
    const hasDesktopSecondaryActions = canManageCategories || canCreateTransactions;

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Contributions, transactions and category breakdown.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Mobile actions menu — Categories / Import / Reports */}
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
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/finance/reports">
                                        <FileBarChart className="mr-2 h-4 w-4" />
                                        Reports
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Desktop secondary buttons */}
                    {hasDesktopSecondaryActions && (
                        <div className="hidden md:flex gap-2 flex-wrap">
                            {canManageCategories && <CategoryModal initialCategories={allCategories} />}
                            {canCreateTransactions && <ImportButton />}
                        </div>
                    )}

                    {/* Primary actions — New Transaction + Download, side by side */}
                    {canCreateTransactions && <TransactionModal categories={activeCategories} />}
                    {canExportReports && <ExportButtons categories={activeCategories} branding={branding} />}

                    {/* Reports — desktop only; mobile has it in the actions menu above */}
                    <Link href="/dashboard/finance/reports" className="hidden md:block">
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
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Transactions
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        {transactions.length > 0 && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                Ksh {transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">{transactions.length} records</span>
                        {transactions.filter(t => t.reconciled).length > 0 && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                                {transactions.filter(t => t.reconciled).length} reconciled
                            </span>
                        )}
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <TransactionsTable transactions={transactions} categories={activeCategories} />
                </div>
            </div>
        </div>
    );
}

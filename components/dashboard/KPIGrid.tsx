import { TrendingUp, CreditCard, BarChart2, Award } from "lucide-react";

interface KPIProps {
    totalRevenue: number;
    transactionCount: number;
    avgTransaction: number;
    topCategory: { name: string; amount: number } | null;
}

export default function KPIGrid({ totalRevenue, transactionCount, avgTransaction, topCategory }: KPIProps) {
    const stats = [
        {
            label: "Total Contributions",
            value: `Ksh ${totalRevenue.toLocaleString()}`,
            icon: TrendingUp,
            colour: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Transactions",
            value: transactionCount.toLocaleString(),
            icon: CreditCard,
            colour: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-500/10",
        },
        {
            label: "Avg. Transaction",
            value: `Ksh ${avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: BarChart2,
            colour: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-500/10",
        },
        {
            label: "Top Category",
            value: topCategory?.name || "—",
            sub: topCategory ? `Ksh ${topCategory.amount.toLocaleString()}` : undefined,
            icon: Award,
            colour: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-500/10",
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, sub, icon: Icon, colour, bg }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <div className={`h-9 w-9 rounded-lg ${bg} ${colour} flex items-center justify-center shrink-0`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold tabular-nums leading-tight truncate" title={value}>{value}</p>
                        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}

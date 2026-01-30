import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, TrendingUp, Award } from "lucide-react";

interface KPIProps {
    totalRevenue: number;
    transactionCount: number;
    avgTransaction: number;
    topCategory: { name: string; amount: number } | null;
}

export default function KPIGrid({ totalRevenue, transactionCount, avgTransaction, topCategory }: KPIProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">Ksh {totalRevenue.toLocaleString()}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{transactionCount}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">Ksh {avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold truncate" title={topCategory?.name}>
                        {topCategory?.name || "-"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {topCategory ? `Ksh ${topCategory.amount.toLocaleString()}` : ""}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

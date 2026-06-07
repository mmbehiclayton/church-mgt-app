import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface CategorySummaryProps {
    categoryStats: { name: string; amount: number }[];
}

// A distinct accent per row — keeps the table scannable without a chart.
const PALETTE = [
    "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#0ea5e9",
    "#f43f5e", "#14b8a6", "#6366f1", "#ec4899", "#84cc16",
];

export default function CategorySummary({ categoryStats }: CategorySummaryProps) {
    const total = categoryStats.reduce((sum, c) => sum + c.amount, 0);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg">By Category</CardTitle>
                    <span className="text-xs text-muted-foreground">
                        {categoryStats.length} {categoryStats.length === 1 ? "category" : "categories"}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {categoryStats.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No category data</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs pl-4">Category</TableHead>
                                <TableHead className="text-xs text-right pr-4">Contributions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categoryStats.map((c, i) => {
                                const pct = total > 0 ? (c.amount / total) * 100 : 0;
                                const color = PALETTE[i % PALETTE.length];
                                return (
                                    <TableRow key={`${c.name}-${i}`}>
                                        <TableCell className="py-2.5 pl-4 pr-2 align-top">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                <span className="truncate font-medium">{c.name}</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2.5 pr-4 pl-2 text-right align-top">
                                            <div className="font-semibold tabular-nums">Ksh {c.amount.toLocaleString()}</div>
                                            <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{pct.toFixed(1)}%</div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="hover:bg-transparent">
                                <TableCell className="pl-4 font-semibold">Total</TableCell>
                                <TableCell className="pr-4 text-right font-bold tabular-nums">Ksh {total.toLocaleString()}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

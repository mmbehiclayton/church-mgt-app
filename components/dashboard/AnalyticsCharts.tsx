"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    LabelList
} from "recharts";

interface AnalyticsProps {
    categoryStats: { name: string; amount: number }[];
}

export default function AnalyticsCharts({ categoryStats }: AnalyticsProps) {
    return (
        <Card>
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">By Category</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-4">
                {categoryStats.length === 0 ? (
                    <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                        No category data
                    </div>
                ) : (
                    <div className="w-full" style={{ height: Math.max(180, categoryStats.length * 42) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={categoryStats}
                                layout="vertical"
                                margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={96}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: string) => value.length > 14 ? `${value.slice(0, 13)}…` : value}
                                />
                                <Tooltip
                                    cursor={{ fill: "rgba(148,163,184,0.12)" }}
                                    formatter={(value: number | undefined) => [`Ksh ${value?.toLocaleString() ?? 0}`, "Total"]}
                                />
                                <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} barSize={18}>
                                    <LabelList
                                        dataKey="amount"
                                        position="right"
                                        fontSize={11}
                                        fill="#64748b"
                                        formatter={(value) => {
                                            const n = Number(value ?? 0);
                                            if (n >= 1_000_000) return `Ksh ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
                                            if (n >= 1_000) return `Ksh ${Math.round(n / 1_000)}k`;
                                            return `Ksh ${n.toLocaleString()}`;
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

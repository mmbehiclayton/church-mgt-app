"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";

interface AnalyticsProps {
    revenueTrend: { date: string; amount: number }[];
    categoryStats: { name: string; amount: number }[];
}

export default function AnalyticsCharts({ revenueTrend, categoryStats }: AnalyticsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Revenue Trend - Line Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Transaction Trend</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="w-full h-[300px] overflow-hidden" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Ksh${value}`}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => [`Ksh ${value?.toLocaleString() ?? 0}`, "Contributions"]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Category Breakdown - Bar Chart */}
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>By Category</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full h-[300px] overflow-hidden" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => [`Ksh ${value?.toLocaleString() ?? 0}`, "Total"]}
                                />
                                <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

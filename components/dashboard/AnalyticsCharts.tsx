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
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Transaction Trend</CardTitle>
                </CardHeader>
                <CardContent className="pl-2 pr-2 sm:pr-6 pb-4">
                    <div className="w-full h-[220px] sm:h-[300px] overflow-hidden">
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
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">By Category</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4">
                    <div className="w-full h-[220px] sm:h-[300px] overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryStats} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={60}
                                    tick={{ fontSize: 11 }}
                                    stroke="#888888"
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Ksh${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => [`Ksh ${value?.toLocaleString() ?? 0}`, "Total"]}
                                />
                                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

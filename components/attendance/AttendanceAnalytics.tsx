"use client";

import { useState, useEffect } from "react";
import { getAttendanceAnalytics } from "@/app/actions";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttendanceStats from "./AttendanceStats";

export default function AttendanceAnalytics() {
    const [data, setData] = useState<{ trends: any[], watchlist: any[], stats: { present: number, absent: number, watchlist: number } } | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            const result = await getAttendanceAnalytics();
            setData(result);
        };
        loadAnalytics();
    }, []);

    if (!data) return <div className="p-4 text-center">Loading analytics...</div>;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <AttendanceStats stats={data.stats} />

            {/* Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Trends (Last 12 Sundays)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        {data.trends.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                Not enough data
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.trends}>
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                    />
                                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

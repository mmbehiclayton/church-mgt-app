"use client";

import { useState, useEffect } from "react";
import { getAttendanceAnalytics } from "@/app/actions";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendanceAnalytics() {
    const [data, setData] = useState<{ trends: any[], watchlist: any[] } | null>(null);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Watchlist */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-700">Watchlist (Missed Last 2 Sundays)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.watchlist.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-gray-500">
                                No members on watchlist. Great job!
                            </div>
                        ) : (
                            <div className="divide-y max-h-[300px] overflow-y-auto">
                                {data.watchlist.map((member: any) => (
                                    <div key={member.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{member.fullName}</div>
                                            <div className="text-xs text-gray-500">{member.homeFellowship?.name || "No Fellowship"}</div>
                                        </div>
                                        <div className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                            Absent
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

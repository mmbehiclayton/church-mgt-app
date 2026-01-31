"use client";

import { useEffect, useState } from "react";
import { getAttendanceAnalytics } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserX } from "lucide-react";
import Link from "next/link";

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const data = await getAttendanceAnalytics();
            setWatchlist(data.watchlist);
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading watchlist...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/attendance">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Attendance Watchlist</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-red-700 flex items-center gap-2">
                        <UserX className="h-5 w-5" />
                        Members Absent for Last 2 Sundays
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {watchlist.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
                            <p className="text-lg font-medium text-green-600">All clear!</p>
                            <p>No members have missed the last 2 consecutive Sunday services.</p>
                        </div>
                    ) : (
                        <div className="divide-y border rounded-md overflow-hidden">
                            <div className="bg-gray-50 p-3 grid grid-cols-1 md:grid-cols-3 font-medium text-sm text-gray-500">
                                <div className="px-2">Member Name</div>
                                <div className="px-2">Home Fellowship</div>
                                <div className="px-2">Status</div>
                            </div>
                            {watchlist.map((member) => (
                                <div key={member.id} className="p-3 grid grid-cols-1 md:grid-cols-3 items-center hover:bg-gray-50 transition-colors">
                                    <div className="px-2 font-medium text-gray-900">{member.fullName}</div>
                                    <div className="px-2 text-gray-600 text-sm">{member.homeFellowship?.name || "No Fellowship"}</div>
                                    <div className="px-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            High Risk (2+ Absences)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserMinus, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AttendanceStatsProps {
    stats: {
        present: number;
        absent: number;
        watchlist: number;
    };
}

export default function AttendanceStats({ stats }: AttendanceStatsProps) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Present</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.present}</h3>
                        <p className="text-xs text-green-600 font-medium">Latest Session</p>
                    </div>
                    <div className="h-9 w-9 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                        <Users className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.absent}</h3>
                        <p className="text-xs text-red-600 font-medium">Latest Session</p>
                    </div>
                    <div className="h-9 w-9 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                        <UserMinus className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>

            <Card
                className="border-l-4 border-l-amber-500 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50 group"
                onClick={() => router.push('/dashboard/attendance/watchlist')}
            >
                <CardContent className="p-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Watchlist</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.watchlist}</h3>
                        <p className="text-xs text-amber-600 font-medium group-hover:underline flex items-center gap-1">
                            View Details <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                        </p>
                    </div>
                    <div className="h-9 w-9 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

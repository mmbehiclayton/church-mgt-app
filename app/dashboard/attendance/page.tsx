"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MarkAttendanceForm from "@/components/attendance/MarkAttendanceForm";
import AttendanceAnalytics from "@/components/attendance/AttendanceAnalytics";
import { getAttendanceSessions, getAttendanceSessionById } from "@/app/actions";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AttendancePage() {
    const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    useEffect(() => {
        const loadSessions = async () => {
            const data = await getAttendanceSessions();
            setSessions(data);
        };
        loadSessions();
    }, [view]);

    const handleEdit = async (sessionId: string) => {
        // Need to fetch full details including records
        // We can use getAttendanceSessionById action
        // For now, let's assume we fetch it inside the form or here.
        // Let's fetch it here to pass as initialData.
        // Or better, let the form fetch it? No, form expects initialData.
        // Wait, I need to look up getAttendanceSessionById from actions.
        // Use inline fetch for now or import it.
        // Let's just pass the ID and let the page fetch it?
        // Simpler: Fetch it here.
        // I need to import getAttendanceSessionById.
    };

    // Actually, let's just make the list item clickable.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Attendance</h1>
                {view === 'LIST' && (
                    <Button onClick={() => { setSelectedSession(null); setView('CREATE'); }} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Mark Attendance
                    </Button>
                )}
                {(view === 'CREATE' || view === 'EDIT') && (
                    <Button variant="outline" onClick={() => setView('LIST')}>
                        Cancel
                    </Button>
                )}
            </div>

            {(view === 'CREATE' || view === 'EDIT') && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-lg font-semibold mb-6">{view === 'EDIT' ? 'Edit Attendance Session' : 'New Attendance Session'}</h2>
                    <MarkAttendanceForm
                        onSuccess={() => setView('LIST')}
                        initialData={selectedSession}
                    />
                </div>
            )}

            {view === 'LIST' && (
                <div className="grid gap-6">
                    {/* Analytics */}
                    <AttendanceAnalytics />

                    {/* Recent Sessions List */}
                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-semibold text-gray-800">Recent Sessions</h3>
                        </div>
                        <div className="divide-y">
                            {sessions.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No attendance sessions found. Click "Mark Attendance" to start.
                                </div>
                            ) : (
                                sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                        onClick={async () => {
                                            const fullSession = await getAttendanceSessionById(session.id);
                                            setSelectedSession(fullSession);
                                            setView('EDIT');
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{format(new Date(session.date), "MMMM d, yyyy")}</div>
                                                <div className="text-sm text-gray-500">{session.type.replace('_', ' ')} • {session.description || "No description"}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{session._count?.records || 0} Records</div>
                                                <div className={cn("text-xs px-2 py-0.5 rounded-full inline-block mt-1",
                                                    session.status === 'SUBMITTED' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                                                )}>
                                                    {session.status}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

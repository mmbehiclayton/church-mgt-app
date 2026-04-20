"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { getMembers, createAttendanceSession, updateAttendanceSession, upsertAttendanceRecords } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Types
interface Member {
    id: string;
    fullName: string;
    homeFellowship?: { name: string } | null;
}

interface MarkAttendanceFormProps {
    onSuccess?: () => void;
    initialData?: any; // Session data for editing
}

export default function MarkAttendanceForm({ onSuccess, initialData }: MarkAttendanceFormProps) {
    const router = useRouter();

    // Steps: 1 = Session Details, 2 = Roll Call
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);

    // Session Form Data
    const [date, setDate] = useState<Date>(initialData ? new Date(initialData.date) : new Date());
    const [type, setType] = useState<string>(initialData?.type || "SUNDAY_SERVICE");
    const [description, setDescription] = useState(initialData?.description || "");

    // Attendance Data
    const [attendance, setAttendance] = useState<{ [memberId: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' }>({});
    const [searchQuery, setSearchQuery] = useState("");

    // Load members and initial attendance
    useEffect(() => {
        const loadMembers = async () => {
            const result = await getMembers();
            setMembers(result.data);

            if (initialData?.records) {
                const initialMap: any = {};
                initialData.records.forEach((r: any) => {
                    initialMap[r.memberId] = r.status;
                });
                setAttendance(initialMap);
            }
        };
        loadMembers();
    }, [initialData]);

    const handleMarkAllPresent = () => {
        const newAttendance = { ...attendance };
        members.forEach(m => {
            newAttendance[m.id] = 'PRESENT';
        });
        setAttendance(newAttendance);
    };

    const toggleStatus = (memberId: string) => {
        setAttendance(prev => {
            const current = prev[memberId];
            let next: 'PRESENT' | 'ABSENT' | 'EXCUSED' = 'PRESENT';
            if (current === 'PRESENT') next = 'ABSENT';
            else if (current === 'ABSENT') next = 'EXCUSED';
            else if (current === 'EXCUSED') next = 'PRESENT';

            return { ...prev, [memberId]: next };
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200';
            case 'ABSENT': return 'bg-red-100 text-red-800 border-red-200';
            case 'EXCUSED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-50 text-gray-500 border-gray-200';
        }
    };

    const handleSubmit = async (submitStatus: 'DRAFT' | 'SUBMITTED') => {
        setLoading(true);
        try {
            let sessionId = initialData?.id;

            if (sessionId) {
                // UPDATE existing session
                const updateResult = await updateAttendanceSession(sessionId, {
                    date,
                    type: type as any,
                    description,
                    status: submitStatus
                });
                if (updateResult.error) throw new Error(updateResult.error);
            } else {
                // CREATE new session
                const sessionResult = await createAttendanceSession({
                    date,
                    type: type as any,
                    description
                });

                if (sessionResult.error || !sessionResult.session) {
                    throw new Error(sessionResult.error || "Failed to create session");
                }
                sessionId = sessionResult.session.id;

                // Create defaults to DRAFT, if submitting we need update? 
                if (submitStatus === 'SUBMITTED') {
                    await updateAttendanceSession(sessionId, { status: 'SUBMITTED' });
                }
            }

            // 2. Prepare Records
            const records = members.map(m => ({
                memberId: m.id,
                status: attendance[m.id] || 'ABSENT',
                notes: ""
            }));

            const recordsResult = await upsertAttendanceRecords(sessionId, records);

            if (recordsResult.error) {
                throw new Error(recordsResult.error);
            }

            toast.success("Success", {
                description: `Attendance ${submitStatus === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully!`,
            });

            if (onSuccess) onSuccess();
            router.push("/dashboard/attendance");
            router.refresh();

        } catch (error: any) {
            toast.error("Error", {
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.homeFellowship?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-8">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm", step === 1 ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600")}>1</div>
                <div className="h-1 flex-1 bg-gray-200 max-w-[100px]" />
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm", step === 2 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>2</div>
            </div>

            {step === 1 && (
                <div className="space-y-4 max-w-md mx-auto">
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Service Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                        >
                            <option value="SUNDAY_SERVICE">Sunday Service</option>
                            <option value="MIDWEEK_SERVICE">Midweek Service</option>
                            <option value="EVENT">Event</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="e.g. Special Guest Speaker"
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={() => setStep(2)}>Next: Roll Call</Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-gray-50 p-4 rounded-lg">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={handleMarkAllPresent}>
                                Mark All Present
                            </Button>
                            <div className="text-sm text-gray-500 self-center">
                                {Object.values(attendance).filter(s => s === 'PRESENT').length} / {members.length} Present
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                        {filteredMembers.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                                <div>
                                    <div className="font-medium">{member.fullName}</div>
                                    <div className="text-xs text-gray-500">{member.homeFellowship?.name || "No Fellowship"}</div>
                                </div>
                                <button
                                    onClick={() => toggleStatus(member.id)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold border transition-colors w-24 text-center",
                                        getStatusColor(attendance[member.id] || 'ABSENT')
                                    )}
                                >
                                    {attendance[member.id] || 'ABSENT'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>Back</Button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => handleSubmit('DRAFT')} disabled={loading}>
                                Save Draft
                            </Button>
                            <Button onClick={() => handleSubmit('SUBMITTED')} disabled={loading}>
                                {loading ? "Submitting..." : "Submit Attendance"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

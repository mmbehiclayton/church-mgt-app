"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Wallet,
    Users,
    Calendar,
    MessageSquare,
    Shield,
    Settings,
    LayoutDashboard,
    Sparkles,
    BookOpen,
    ChevronRight,
} from "lucide-react";

interface AccessMap {
    finance: boolean;
    members: boolean;
    attendance: boolean;
    sms: boolean;
    minutes: boolean;
    users: boolean;
    rbac: boolean;
    settings: boolean;
}

interface Stats {
    memberCount: number;
    latestSession: {
        id: string;
        date: Date | string;
        type: string;
        status: string;
        _count: { records: number };
    } | null;
    recentCampaign: {
        id: string;
        name: string | null;
        message: string;
        status: string;
        totalRecipients: number;
        sentCount: number;
        createdAt: Date | string;
    } | null;
}

interface Props {
    userName: string | null;
    access: AccessMap;
    stats: Stats;
}

const MODULES = [
    {
        key: "finance" as const,
        title: "Finance",
        description: "Contributions, expenses & M-Pesa imports",
        href: "/dashboard/finance",
        icon: Wallet,
        colour: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
    },
    {
        key: "members" as const,
        title: "Membership",
        description: "Members, departments & fellowships",
        href: "/dashboard/membership",
        icon: Users,
        colour: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10",
    },
    {
        key: "attendance" as const,
        title: "Attendance",
        description: "Sunday & midweek services, watchlist",
        href: "/dashboard/attendance",
        icon: Calendar,
        colour: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-500/10",
    },
    {
        key: "sms" as const,
        title: "SMS",
        description: "Bulk messaging, templates & delivery reports",
        href: "/dashboard/sms",
        icon: MessageSquare,
        colour: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-500/10",
    },
    {
        key: "minutes" as const,
        title: "Meeting Minutes",
        description: "Upload & browse PDF records",
        href: "/dashboard/minutes",
        icon: BookOpen,
        colour: "text-teal-600 dark:text-teal-400",
        bg: "bg-teal-500/10",
    },
    {
        key: "users" as const,
        title: "Users",
        description: "Invite, deactivate & audit admins",
        href: "/dashboard/users",
        icon: Shield,
        colour: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
    },
    {
        key: "rbac" as const,
        title: "Roles & Permissions",
        description: "Granular access control",
        href: "/dashboard/rbac",
        icon: LayoutDashboard,
        colour: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
    },
    {
        key: "settings" as const,
        title: "Settings",
        description: "Organisation, finance & structure",
        href: "/dashboard/settings",
        icon: Settings,
        colour: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-500/10",
    },
];

function greeting(): string {
    const h = new Date().getHours();
    if (h < 5) return "You're up early";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Working late";
}

const SESSION_TYPE: Record<string, string> = {
    SUNDAY_SERVICE: "Sunday",
    MIDWEEK_SERVICE: "Midweek",
    EVENT: "Event",
    OTHER: "Other",
};

const CAMPAIGN_STATUS_STYLE: Record<string, string> = {
    SENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    SENDING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    DRAFT: "bg-muted text-muted-foreground",
};

export default function DashboardLanding({ userName, access, stats }: Props) {
    const accessibleModules = MODULES.filter(m => access[m.key as keyof AccessMap]);
    const firstName = userName?.split(" ")[0] ?? null;

    if (accessibleModules.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <Shield className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold">No accessible modules</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Ask an administrator to grant you a role.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Hero bar ── */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/10 via-card to-violet-500/5 px-5 py-5">
                <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-primary flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3 w-3" /> {greeting()}
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Here&apos;s what&apos;s happening with the church today.
                        </p>
                    </div>
                    {/* Quick-action buttons */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {access.sms && (
                            <Link href="/dashboard/sms/compose">
                                <Button size="sm" variant="outline">
                                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> New SMS
                                </Button>
                            </Link>
                        )}
                        {access.attendance && (
                            <Link href="/dashboard/attendance/mark">
                                <Button size="sm">
                                    <Calendar className="h-3.5 w-3.5 mr-1.5" /> Mark Attendance
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Compact stat strip ── */}
            {(access.members || access.attendance || access.sms) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {access.members && (
                        <Link href="/dashboard/membership" className="group">
                            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
                                <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Active Members</p>
                                    <p className="text-xl font-bold tabular-nums leading-tight">{stats.memberCount.toLocaleString()}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </Link>
                    )}

                    {access.attendance && (
                        <Link href="/dashboard/attendance" className="group">
                            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
                                <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Latest Service</p>
                                    {stats.latestSession ? (
                                        <>
                                            <p className="text-xl font-bold tabular-nums leading-tight">{stats.latestSession._count.records}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {SESSION_TYPE[stats.latestSession.type] ?? stats.latestSession.type} · {format(new Date(stats.latestSession.date), "MMM d")}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No sessions yet</p>
                                    )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </Link>
                    )}

                    {access.sms && (
                        <Link href="/dashboard/sms" className="group">
                            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
                                <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <MessageSquare className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Last Campaign</p>
                                    {stats.recentCampaign ? (
                                        <>
                                            <p className="text-sm font-semibold truncate leading-tight mt-0.5">
                                                {stats.recentCampaign.name || stats.recentCampaign.message.slice(0, 28)}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CAMPAIGN_STATUS_STYLE[stats.recentCampaign.status] ?? ""}`}>
                                                    {stats.recentCampaign.status}
                                                </Badge>
                                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                                    {stats.recentCampaign.sentCount}/{stats.recentCampaign.totalRecipients} sent
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No campaigns yet</p>
                                    )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </Link>
                    )}
                </div>
            )}

            {/* ── Module grid ── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Modules</h2>
                    <span className="text-xs text-muted-foreground">{accessibleModules.length} available</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {accessibleModules.map(m => {
                        const Icon = m.icon;
                        return (
                            <Link key={m.key} href={m.href} className="group">
                                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 hover:border-primary/40 hover:bg-muted/30 transition-colors h-full">
                                    <div className={`h-8 w-8 rounded-lg ${m.bg} ${m.colour} flex items-center justify-center shrink-0`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{m.title}</p>
                                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{m.description}</p>
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Wallet,
    Users,
    Calendar,
    MessageSquare,
    Shield,
    Settings,
    ArrowRight,
    LayoutDashboard,
    Sparkles,
} from "lucide-react";

interface AccessMap {
    finance: boolean;
    members: boolean;
    attendance: boolean;
    sms: boolean;
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
        description: "Contributions, expenses, M-Pesa imports.",
        href: "/dashboard/finance",
        icon: Wallet,
        accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
    },
    {
        key: "members" as const,
        title: "Membership",
        description: "Members, departments, fellowships.",
        href: "/dashboard/membership",
        icon: Users,
        accent: "from-blue-500/15 to-blue-500/5 text-blue-600",
    },
    {
        key: "attendance" as const,
        title: "Attendance",
        description: "Sunday and midweek services, watchlist.",
        href: "/dashboard/attendance",
        icon: Calendar,
        accent: "from-sky-500/15 to-sky-500/5 text-sky-600",
    },
    {
        key: "sms" as const,
        title: "SMS",
        description: "Bulk messaging, templates, delivery reports.",
        href: "/dashboard/sms",
        icon: MessageSquare,
        accent: "from-violet-500/15 to-violet-500/5 text-violet-600",
    },
    {
        key: "users" as const,
        title: "Users",
        description: "Invite, deactivate, audit admins.",
        href: "/dashboard/users",
        icon: Shield,
        accent: "from-amber-500/15 to-amber-500/5 text-amber-600",
    },
    {
        key: "rbac" as const,
        title: "Roles & Permissions",
        description: "Granular access control.",
        href: "/dashboard/rbac",
        icon: LayoutDashboard,
        accent: "from-rose-500/15 to-rose-500/5 text-rose-600",
    },
    {
        key: "settings" as const,
        title: "Settings",
        description: "Organization, finance, structure.",
        href: "/dashboard/settings",
        icon: Settings,
        accent: "from-slate-500/15 to-slate-500/5 text-slate-600",
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

export default function DashboardLanding({ userName, access, stats }: Props) {
    const accessibleModules = MODULES.filter(m => access[m.key]);

    if (accessibleModules.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md text-center">
                    <CardContent className="py-12">
                        <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                            <Shield className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold">No accessible modules</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Your account does not currently have access to any modules. Ask an administrator to grant you a role.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-violet-500/5 px-6 py-8 md:p-10">
                <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
                <div className="relative">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary mb-3">
                        <Sparkles className="h-3.5 w-3.5" />
                        {greeting()}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        {userName ? `Welcome back, ${userName.split(" ")[0]}.` : "Welcome back."}
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl">
                        Here&apos;s what&apos;s happening with the church today.
                    </p>
                </div>
            </div>

            {/* At a glance */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {access.members && (
                    <Card className="card-lift cursor-default">
                        <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
                            <span className="text-sm font-medium text-muted-foreground">Active Members</span>
                            <Users className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                            <div className="text-3xl font-bold">{stats.memberCount.toLocaleString()}</div>
                            <Link
                                href="/dashboard/membership"
                                className="text-xs text-primary inline-flex items-center mt-2 hover:underline"
                            >
                                Manage roster <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {access.attendance && (
                    <Card className="card-lift cursor-default">
                        <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
                            <span className="text-sm font-medium text-muted-foreground">Latest Service</span>
                            <Calendar className="h-4 w-4 text-sky-500" />
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                            {stats.latestSession ? (
                                <>
                                    <div className="text-3xl font-bold">{stats.latestSession._count.records}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(stats.latestSession.date), "MMM d, yyyy")} ·{" "}
                                        {stats.latestSession.type.replace("_", " ")}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-3xl font-bold">—</div>
                                    <div className="text-xs text-muted-foreground mt-1">No sessions yet</div>
                                </>
                            )}
                            <Link
                                href="/dashboard/attendance"
                                className="text-xs text-primary inline-flex items-center mt-2 hover:underline"
                            >
                                Mark attendance <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {access.sms && (
                    <Card className="card-lift cursor-default">
                        <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
                            <span className="text-sm font-medium text-muted-foreground">Last SMS Campaign</span>
                            <MessageSquare className="h-4 w-4 text-violet-500" />
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                            {stats.recentCampaign ? (
                                <>
                                    <div className="font-semibold truncate">
                                        {stats.recentCampaign.name || stats.recentCampaign.message.slice(0, 32)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant="secondary" className="text-[10px]">
                                            {stats.recentCampaign.status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {stats.recentCampaign.sentCount} / {stats.recentCampaign.totalRecipients} sent
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-3xl font-bold">—</div>
                                    <div className="text-xs text-muted-foreground mt-1">No campaigns yet</div>
                                </>
                            )}
                            <Link
                                href="/dashboard/sms"
                                className="text-xs text-primary inline-flex items-center mt-2 hover:underline"
                            >
                                Open SMS <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Modules grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold tracking-tight">Your modules</h2>
                    <span className="text-xs text-muted-foreground">
                        {accessibleModules.length} accessible
                    </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {accessibleModules.map(m => {
                        const Icon = m.icon;
                        return (
                            <Link key={m.key} href={m.href} className="group block">
                                <Card className="card-lift h-full">
                                    <CardContent className="p-5">
                                        <div
                                            className={`h-10 w-10 rounded-xl bg-gradient-to-br ${m.accent} flex items-center justify-center mb-4`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="font-semibold tracking-tight group-hover:text-primary transition-colors">
                                            {m.title}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                            {m.description}
                                        </p>
                                        <div className="flex items-center text-xs text-primary mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Open <ArrowRight className="h-3 w-3 ml-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Quick actions */}
            {(access.sms || access.attendance) && (
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="font-semibold tracking-tight">Quick actions</div>
                            <div className="text-sm text-muted-foreground">Common tasks at your fingertips</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {access.sms && (
                                <Link href="/dashboard/sms/compose">
                                    <Button variant="outline" size="sm">
                                        <MessageSquare className="h-3.5 w-3.5 mr-2" />
                                        New SMS
                                    </Button>
                                </Link>
                            )}
                            {access.attendance && (
                                <Link href="/dashboard/attendance">
                                    <Button variant="outline" size="sm">
                                        <Calendar className="h-3.5 w-3.5 mr-2" />
                                        Mark Attendance
                                    </Button>
                                </Link>
                            )}
                            {access.members && (
                                <Link href="/dashboard/membership">
                                    <Button variant="outline" size="sm">
                                        <Users className="h-3.5 w-3.5 mr-2" />
                                        View Members
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

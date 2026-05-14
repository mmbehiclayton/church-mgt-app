"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    LogOut,
    Settings,
    Users,
    Calendar,
    MessageSquare,
    Shield,
    Wallet,
    BookOpen,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { signOut, useSession } from "next-auth/react";

interface SidebarProps {
    className?: string;
    onNavigate?: () => void;
}

interface MenuItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    permission: string;
}

interface MenuSection {
    label: string;
    items: MenuItem[];
}

const SECTIONS: MenuSection[] = [
    {
        label: "Operations",
        items: [
            { name: "Finance", href: "/dashboard/finance", icon: Wallet, permission: "transactions:read" },
            { name: "Attendance", href: "/dashboard/attendance", icon: Calendar, permission: "attendance:read" },
        ],
    },
    {
        label: "People",
        items: [
            { name: "Membership", href: "/dashboard/membership", icon: Users, permission: "members:read" },
        ],
    },
    {
        label: "Communication",
        items: [
            { name: "SMS", href: "/dashboard/sms", icon: MessageSquare, permission: "sms:read" },
        ],
    },
    {
        label: "Resources",
        items: [
            { name: "Meeting Minutes", href: "/dashboard/minutes", icon: BookOpen, permission: "minutes:read" },
        ],
    },
    {
        label: "Administration",
        items: [
            { name: "User Management", href: "/dashboard/users", icon: Shield, permission: "users:read" },
            { name: "RBAC Management", href: "/dashboard/rbac", icon: LayoutDashboard, permission: "rbac:manage" },
            { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: "settings:read" },
        ],
    },
];

function getInitials(name?: string | null, email?: string | null): string {
    const source = name?.trim() || email?.trim() || "?";
    const parts = source.split(/[\s@.]+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();
    const { data: session } = useSession();

    // Filter sections + items by permission
    const visibleSections = SECTIONS
        .map(section => ({
            ...section,
            items: section.items.filter(item => !item.permission || hasPermission(item.permission)),
        }))
        .filter(section => section.items.length > 0);

    const handleLogout = () => {
        signOut({ callbackUrl: "/" });
    };

    const user = session?.user;
    const initials = getInitials(user?.name, user?.email);

    return (
        <div
            className={cn(
                "h-full w-64 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
                className
            )}
        >
            {/* Brand header */}
            <div className="px-5 h-16 flex items-center gap-3 border-b border-sidebar-border shrink-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-sm">
                    <Image src="/icons/dove.svg" alt="" width={20} height={20} priority />
                </div>
                <div className="leading-tight">
                    <div className="font-semibold tracking-tight">Church CMS</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
                {visibleSections.map(section => (
                    <div key={section.label}>
                        <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {section.label}
                        </div>
                        <ul className="space-y-0.5">
                            {section.items.map(item => {
                                const active =
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                                return (
                                    <li key={item.href} className="relative">
                                        {active && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                                        )}
                                        <Link
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                                active
                                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                                            )}
                                        >
                                            <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User pill */}
            <div className="border-t border-sidebar-border p-3 shrink-0">
                <div className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                            {user?.name || user?.email?.split("@")[0] || "Signed in"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                            {user?.email || ""}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        aria-label="Sign out"
                        title="Sign out"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LogOut, Settings, Users, Calendar, MessageSquare } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarProps {
    className?: string; // For mobile visibility classes
    onNavigate?: () => void;
}

import { signOut } from "next-auth/react";

export function Sidebar({ className, onNavigate }: SidebarProps) {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();

    const menuItems = [
        {
            name: "Finance",
            href: "/dashboard/finance",
            icon: LayoutDashboard,
            permission: "transactions:read"
        },
        {
            name: "Membership",
            href: "/dashboard/membership",
            icon: Users,
            permission: "members:read"
        },
        {
            name: "Attendance",
            href: "/dashboard/attendance",
            icon: Calendar,
            permission: "attendance:read"
        },
        {
            name: "SMS",
            href: "/dashboard/sms",
            icon: MessageSquare,
            permission: "sms:read"
        },
        // { name: "Reports", href: "/dashboard/reports", icon: FileText },
        {
            name: "User Management",
            href: "/dashboard/users",
            icon: Users,
            permission: "users:read"
        },
        {
            name: "Settings",
            href: "/dashboard/settings",
            icon: Settings,
            permission: "settings:read"
        },
        {
            name: "RBAC Management",
            href: "/dashboard/rbac",
            icon: Users,
            permission: "rbac:manage"
        },
    ];

    // Filter menu items based on permissions
    const accessibleMenuItems = menuItems.filter(item =>
        !item.permission || hasPermission(item.permission)
    );

    const handleLogout = () => {
        signOut({ callbackUrl: "/" });
    };

    return (
        <div className={cn("pb-12 h-full w-64 border-r bg-white space-y-4 py-4 flex flex-col", className)}>
            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary">
                    Church Dashboard
                </h2>
                <div className="space-y-1">
                    {accessibleMenuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="px-3 py-2 mt-auto">
                <div className="space-y-1">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}

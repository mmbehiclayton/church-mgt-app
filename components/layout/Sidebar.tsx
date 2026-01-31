"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Wallet, Repeat, LogOut, FileText, Settings, Users } from "lucide-react";

interface SidebarProps {
    className?: string; // For mobile visibility classes
}

import { signOut } from "next-auth/react";

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();

    const menuItems = [
        { name: "Finance", href: "/dashboard", icon: LayoutDashboard },
        { name: "Transactions", href: "/dashboard?view=transactions", icon: Repeat },
        { name: "Membership", href: "/dashboard/membership", icon: Users },
        // { name: "Reports", href: "/dashboard/reports", icon: FileText },
        { name: "User Management", href: "/dashboard/users", icon: Users },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    const handleLogout = () => {
        signOut({ callbackUrl: "/" });
    };

    return (
        <div className={cn("pb-12 h-full w-64 border-r bg-white space-y-4 py-4 flex flex-col", className)}>
            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary">
                    Church Finance
                </h2>
                <div className="space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { LayoutDashboard, PenSquare, History, FileText } from "lucide-react";

export default function SmsNav() {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();

    const navItems = [
        { title: "Dashboard", href: "/dashboard/sms", icon: LayoutDashboard, exact: true, show: true },
        { title: "Compose", href: "/dashboard/sms/compose", icon: PenSquare, exact: false, show: hasPermission("sms", "create") },
        { title: "History", href: "/dashboard/sms/history", icon: History, exact: false, show: true },
        { title: "Templates", href: "/dashboard/sms/templates", icon: FileText, exact: false, show: true },
    ].filter(item => item.show);

    return (
        <div className="border-b border-border overflow-x-auto scrollbar-hide">
            <nav className="flex gap-1 sm:gap-2 -mb-px">
                {navItems.map(item => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                isActive
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

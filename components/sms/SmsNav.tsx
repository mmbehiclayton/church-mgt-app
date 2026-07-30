"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { triggerBackgroundDeliverySync } from "@/app/sms/actions";
import { LayoutDashboard, PenSquare, History, FileText, CheckCircle2 } from "lucide-react";

const BG_SYNC_THROTTLE_MS = 2 * 60 * 1000; // avoid hammering Bonga on every SMS-tab navigation
const BG_SYNC_STORAGE_KEY = "sms_bg_sync_at";

export default function SmsNav() {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();

    // Trickle delivery-status sync while someone is actively using the SMS
    // module. Vercel Hobby only allows a once-a-day cron schedule, so this
    // fire-and-forget nudge is what keeps "Delivered" counts reasonably
    // fresh in between — on top of the daily cron and the manual buttons.
    useEffect(() => {
        if (!hasPermission("sms", "read")) return;
        const last = Number(sessionStorage.getItem(BG_SYNC_STORAGE_KEY) || 0);
        if (Date.now() - last < BG_SYNC_THROTTLE_MS) return;
        sessionStorage.setItem(BG_SYNC_STORAGE_KEY, String(Date.now()));
        triggerBackgroundDeliverySync().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const navItems = [
        { title: "Dashboard", href: "/dashboard/sms", icon: LayoutDashboard, exact: true, show: true },
        { title: "Compose", href: "/dashboard/sms/compose", icon: PenSquare, exact: false, show: hasPermission("sms", "create") },
        { title: "History", href: "/dashboard/sms/history", icon: History, exact: false, show: true },
        { title: "Delivery Reports", href: "/dashboard/sms/reports", icon: CheckCircle2, exact: false, show: hasPermission("sms", "read") },
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

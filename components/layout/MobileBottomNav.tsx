"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, Calendar, MessageSquare, LayoutDashboard, Wallet } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

const ITEMS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, permission: null },
  { name: "Members", href: "/dashboard/membership", icon: Users, permission: "members:read" },
  { name: "Attend", href: "/dashboard/attendance", icon: Calendar, permission: "attendance:read" },
  { name: "SMS", href: "/dashboard/sms", icon: MessageSquare, permission: "sms:read" },
  { name: "Finance", href: "/dashboard/finance", icon: Wallet, permission: "transactions:read" },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  const visible = ITEMS.filter(i => !i.permission || hasPermission(i.permission));

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary navigation"
    >
      <ul className="grid grid-cols-5">
        {visible.slice(0, 5).map(item => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 min-h-[3.75rem] py-2 text-[10px] font-medium transition-colors active:bg-muted/60",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary" />}
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

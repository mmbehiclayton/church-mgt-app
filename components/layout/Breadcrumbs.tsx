"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    finance: "Finance",
    membership: "Membership",
    attendance: "Attendance",
    watchlist: "Watchlist",
    sms: "SMS",
    compose: "Compose",
    history: "History",
    templates: "Templates",
    users: "Users",
    rbac: "Roles & Permissions",
    settings: "Settings",
    organization: "Organization",
    structure: "Structure",
};

function prettify(seg: string): string {
    if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
    // Skip dynamic id-looking segments (cuid/uuid)
    if (/^[a-z0-9]{12,}$/i.test(seg)) return "Details";
    return seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function Breadcrumbs() {
    const pathname = usePathname();
    if (!pathname || pathname === "/") return null;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    // Drop the trailing leaf — show it as a static label after the chain.
    return (
        <nav aria-label="Breadcrumb" className="flex items-center text-sm">
            <ol className="flex items-center gap-1 text-muted-foreground">
                <li>
                    <Link
                        href="/dashboard"
                        className="flex items-center hover:text-foreground transition-colors"
                        aria-label="Home"
                    >
                        <Home className="h-3.5 w-3.5" />
                    </Link>
                </li>
                {parts.slice(1).map((part, i, arr) => {
                    const href = "/" + parts.slice(0, i + 2).join("/");
                    const isLast = i === arr.length - 1;
                    return (
                        <li key={href} className="flex items-center gap-1">
                            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                            {isLast ? (
                                <span className={cn("font-medium text-foreground")}>
                                    {prettify(part)}
                                </span>
                            ) : (
                                <Link
                                    href={href}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {prettify(part)}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

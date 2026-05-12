"use client";

import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import CommandPaletteTrigger from "@/components/CommandPaletteTrigger";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

interface HeaderProps {
    onMenuClick: () => void;
    organization: {
        name: string;
        logoUrl?: string | null;
    } | null;
}

function getInitials(name?: string | null, email?: string | null): string {
    const source = name?.trim() || email?.trim() || "?";
    const parts = source.split(/[\s@.]+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Header({ onMenuClick, organization }: HeaderProps) {
    const orgName = organization?.name || "Church App";
    const logoUrl = organization?.logoUrl;
    const { data: session } = useSession();
    const user = session?.user;
    const initials = getInitials(user?.name, user?.email);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 md:px-6 justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0"
                    onClick={onMenuClick}
                    aria-label="Toggle navigation"
                >
                    <Menu className="h-5 w-5" />
                </Button>
                {/* Show org logo + name on mobile (sidebar is hidden), breadcrumbs on desktop */}
                <div className="md:hidden flex items-center gap-2 min-w-0">
                    {logoUrl ? (
                        <div className="h-7 w-7 rounded-md overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                    ) : null}
                    <div className="font-semibold text-sm truncate">{orgName}</div>
                </div>
                <div className="hidden md:block min-w-0">
                    <Breadcrumbs />
                </div>
            </div>

            <div className="flex items-center gap-1">
                <CommandPaletteTrigger />
                <ThemeToggle />
                <NotificationBell />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-9 px-2 ml-1 rounded-full gap-2"
                            aria-label="Account menu"
                        >
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                {initials}
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="text-sm font-semibold truncate">
                                {user?.name || user?.email?.split("@")[0] || "Signed in"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                                {user?.email}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/dashboard/settings">
                            <DropdownMenuItem className="cursor-pointer">
                                <User className="h-4 w-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem disabled>Support</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive cursor-pointer"
                            onSelect={() => signOut({ callbackUrl: "/" })}
                        >
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

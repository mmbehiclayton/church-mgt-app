"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building, Wallet, Building2 } from "lucide-react";

export default function SettingsNav() {
    const pathname = usePathname();

    const navItems = [
        {
            title: "Organization",
            href: "/dashboard/settings/organization",
            icon: Building,
        },
        {
            title: "Finance Categories",
            href: "/dashboard/settings/finance",
            icon: Wallet,
        },
        {
            title: "Church Structure",
            href: "/dashboard/settings/structure",
            icon: Building2,
        },
    ];

    return (
        <div className="flex flex-col space-y-4">
            <div className="px-4 md:px-0">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your centralized application settings.</p>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex flex-col space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                isActive
                                    ? "bg-slate-100 text-slate-900"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4", isActive ? "text-slate-900" : "text-slate-400")} />
                            {item.title}
                        </Link>
                    )
                })}
            </nav>

            {/* Mobile Navigation (Horizontal Scrollable Tabs) */}
            <div className="md:hidden overflow-x-auto border-b border-slate-200 pb-px px-4 scrollbar-hide">
                <nav className="flex space-x-6">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 whitespace-nowrap py-3 text-sm font-medium transition-colors border-b-2",
                                    isActive
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/dashboard/Footer";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import OnboardingTour from "@/components/OnboardingTour";

interface Organization {
    name: string;
    logoUrl?: string | null;
}

interface DashboardClientLayoutProps {
    children: React.ReactNode;
    organization: Organization | null;
}

export default function DashboardClientLayout({
    children,
    organization,
}: DashboardClientLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <CommandPaletteProvider>
            <div className="flex h-screen bg-background overflow-hidden">
                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <div
                    className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <Sidebar onNavigate={() => setSidebarOpen(false)} />
                </div>

                {/* Main */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <Header
                        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                        organization={organization}
                    />
                    <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 scroll-smooth pb-20 md:pb-6">
                        {children}
                    </main>
                    <div className="flex-shrink-0 hidden md:block">
                        <Footer />
                    </div>
                </div>
            </div>

            <MobileBottomNav />
            <OnboardingTour />
        </CommandPaletteProvider>
    );
}

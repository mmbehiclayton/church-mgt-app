"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/dashboard/Footer";

// Define Organization interface locally or import if available
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
    organization
}: DashboardClientLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 border-r
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} organization={organization} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}

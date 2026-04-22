"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
}

export default function CollapsibleSection({
    title,
    children,
    defaultOpen = true,
    className
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Card className={cn("overflow-hidden transition-all duration-200", className)}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-gray-50/50 border-b">
                <CardTitle className="text-base font-semibold text-gray-700">
                    {title}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="sr-only">Toggle {title}</span>
                </Button>
            </CardHeader>
            {isOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200 fade-in">
                    {children}
                </div>
            )}
        </Card>
    );
}

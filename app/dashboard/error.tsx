"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <EmptyState
                icon={AlertTriangle}
                title="Something went wrong"
                description="This page hit an unexpected error. You can try again, or use the sidebar to head somewhere else."
                action={<Button onClick={() => reset()}>Try again</Button>}
            />
        </div>
    );
}

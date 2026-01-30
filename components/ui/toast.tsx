"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
    id: string;
    title?: string;
    description?: string;
    variant?: "default" | "success" | "error" | "warning";
    duration?: number;
}

interface ToastContextType {
    toasts: ToastProps[];
    addToast: (toast: Omit<ToastProps, "id">) => void;
    removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastProps[]>([]);

    const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        // Auto-remove after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: ToastProps[]; removeToast: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function Toast({ title, description, variant = "default", onClose }: ToastProps & { onClose: () => void }) {
    const variants = {
        default: "bg-white border-gray-200 text-gray-900",
        success: "bg-green-50 border-green-200 text-green-900",
        error: "bg-red-50 border-red-200 text-red-900",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    };

    const iconColors = {
        default: "text-gray-500",
        success: "text-green-500",
        error: "text-red-500",
        warning: "text-yellow-500",
    };

    return (
        <div
            className={cn(
                "pointer-events-auto rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right",
                variants[variant]
            )}
        >
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    {title && <div className="font-semibold text-sm mb-1">{title}</div>}
                    {description && <div className="text-sm opacity-90">{description}</div>}
                </div>
                <button
                    onClick={onClose}
                    className={cn(
                        "rounded-md p-1 hover:bg-black/5 transition-colors",
                        iconColors[variant]
                    )}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

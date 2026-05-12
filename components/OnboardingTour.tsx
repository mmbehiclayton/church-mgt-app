"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Keyboard, Bell, Users, MessageSquare, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "church-cms-onboarding-completed";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to Church CMS",
    description:
      "A quick 30-second tour so you know where everything lives. You can re-open it from settings later.",
  },
  {
    icon: Users,
    title: "Membership at the core",
    description:
      "Every member belongs to a home fellowship and one or more departments. Attendance, SMS audiences, and reports all build on this graph.",
  },
  {
    icon: MessageSquare,
    title: "Bulk SMS, no spreadsheets",
    description:
      "Send to whole groups in seconds. Pick departments + fellowships, preview the audience, and Bonga handles delivery — with live reports.",
  },
  {
    icon: Keyboard,
    title: "Press ⌘K (Ctrl+K) anywhere",
    description:
      "Jump to any page or action without lifting your hands off the keyboard. The fastest way to move around.",
  },
  {
    icon: Sun,
    title: "Dark mode lives in your header",
    description:
      "Toggle light, dark, or follow your system. The bell next to it shows recent SMS and attendance activity.",
  },
  {
    icon: Bell,
    title: "You're ready",
    description: "That's it — your modules are listed below. Pop back into this tour from settings whenever you like.",
  },
];

export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    // Intentional client-only mount hydration to avoid SSR/CSR mismatch:
    // the persisted state can only be known after the browser is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!done) setOpen(true);
  }, []);

  const close = (markDone = true) => {
    if (markDone) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    setStep(0);
  };

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden",
          "animate-in zoom-in-95 slide-in-from-bottom-4"
        )}
      >
        {/* Top gradient strip */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

        <button
          onClick={() => close()}
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Icon className="h-6 w-6" />
          </div>
          <h2 id="onboarding-title" className="text-xl font-bold tracking-tight">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.description}</p>

          {/* Dots */}
          <div className="flex items-center gap-1.5 mt-6">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" size="sm" onClick={() => close()}>
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) close();
                  else setStep(s => s + 1);
                }}
              >
                {isLast ? "Get started" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden text-white bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800">
        {/* Decorative glow */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/20 blur-3xl translate-x-1/3 translate-y-1/3" />
        {/* Subtle pattern */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 30%, white 0, transparent 2px), radial-gradient(circle at 75% 70%, white 0, transparent 2px)',
            backgroundSize: '60px 60px, 50px 50px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white">
            <Image src="/icons/dove.svg" alt="" width={22} height={22} priority />
          </div>
          <div className="font-semibold text-lg tracking-tight">Church CMS</div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-5">
            <div className="hidden xl:flex h-20 w-20 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center text-white shrink-0">
              <Image src="/icons/dove.svg" alt="" width={48} height={48} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight leading-tight">
                Church Management System.
              </h1>
              <p className="mt-4 text-indigo-100/90 text-base max-w-md leading-relaxed">
                Members, attendance, finances, and SMS — woven into one calm, secure platform built for the people doing the work on Sundays.
              </p>
            </div>
          </div>

          <ul className="space-y-3 text-sm text-indigo-100/90">
            <li className="flex items-start gap-3">
              <Users className="h-5 w-5 mt-0.5 shrink-0 text-indigo-200" />
              <span>Full membership graph: departments, fellowships, attendance trends.</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 mt-0.5 shrink-0 text-indigo-200" />
              <span>Bulk SMS to any group, with delivery receipts and templates.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-indigo-200" />
              <span>Role-based access — only the right hands touch the right data.</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-indigo-200/70">
          © {new Date().getFullYear()} Church Management System
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand bar */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Image src="/icons/dove.svg" alt="" width={22} height={22} priority />
            </div>
            <div className="font-semibold text-lg tracking-tight">Church CMS</div>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to continue to your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@church.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                {/* Reset link placeholder — keep visible to look complete */}
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setError("Contact an administrator to reset your password.")}
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className={cn("w-full h-11 font-medium", loading && "opacity-90")}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Need access? Ask an administrator to invite you.
          </p>
        </div>
      </div>
    </div>
  );
}

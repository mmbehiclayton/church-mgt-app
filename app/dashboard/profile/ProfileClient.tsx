"use client";

import { useState } from "react";
import { updateOwnProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { User, Lock, Mail, Shield } from "lucide-react";

interface Props {
    user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        createdAt: Date;
    };
}

export default function ProfileClient({ user }: Props) {
    const { update: updateSession } = useSession();

    // Name form
    const [name, setName] = useState(user.name || "");
    const [savingName, setSavingName] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    const initials = (user.name || user.email)
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    async function handleSaveName(e: React.FormEvent) {
        e.preventDefault();
        if (name.trim() === (user.name || "").trim()) {
            toast.info("No changes to save");
            return;
        }
        setSavingName(true);
        const result = await updateOwnProfile({ name });
        setSavingName(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Name updated");
            await updateSession({ name: name.trim() });
        }
    }

    async function handleSavePassword(e: React.FormEvent) {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("All password fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        setSavingPassword(true);
        const result = await updateOwnProfile({ currentPassword, newPassword });
        setSavingPassword(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Password updated");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    }

    return (
        <div className="max-w-2xl space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Update your name and password.</p>
            </div>

            {/* Avatar + meta */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                    {initials}
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{user.name || "—"}</div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Shield className="h-3 w-3 shrink-0" />
                        <span>{user.role}</span>
                    </div>
                </div>
            </div>

            {/* Name */}
            <div className="rounded-xl border border-border bg-card">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm">Display Name</h2>
                </div>
                <form onSubmit={handleSaveName} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Full name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="max-w-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Email address</Label>
                        <Input value={user.email} disabled className="max-w-sm bg-muted/40 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                    </div>
                    <Button type="submit" size="sm" disabled={savingName}>
                        {savingName ? "Saving…" : "Save name"}
                    </Button>
                </form>
            </div>

            {/* Password */}
            <div className="rounded-xl border border-border bg-card">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm">Change Password</h2>
                </div>
                <form onSubmit={handleSavePassword} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="currentPassword">Current password</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="max-w-sm"
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="newPassword">New password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="max-w-sm"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword">Confirm new password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="max-w-sm"
                            autoComplete="new-password"
                        />
                    </div>
                    <Button type="submit" size="sm" disabled={savingPassword}>
                        {savingPassword ? "Updating…" : "Update password"}
                    </Button>
                </form>
            </div>
        </div>
    );
}

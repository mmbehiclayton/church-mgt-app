"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  Calendar,
  Wallet,
  MessageSquare,
  Settings,
  Shield,
  Plus,
  FileText,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/ThemeProvider";
import { signOut } from "next-auth/react";

interface PaletteContext {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<PaletteContext | null>(null);

export function useCommandPalette() {
  return useContext(Ctx);
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);

  // Global ⌘K / Ctrl+K binding
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { setTheme } = useTheme();

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Ctx.Provider value={{ open, setOpen, toggle }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Search and run commands">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigate">
            {hasPermission("members:read") && (
              <CommandItem onSelect={() => go("/dashboard/membership")}>
                <Users className="h-4 w-4 mr-2" /> Membership
              </CommandItem>
            )}
            {hasPermission("attendance:read") && (
              <CommandItem onSelect={() => go("/dashboard/attendance")}>
                <Calendar className="h-4 w-4 mr-2" /> Attendance
              </CommandItem>
            )}
            {hasPermission("transactions:read") && (
              <CommandItem onSelect={() => go("/dashboard/finance")}>
                <Wallet className="h-4 w-4 mr-2" /> Finance
              </CommandItem>
            )}
            {hasPermission("sms:read") && (
              <CommandItem onSelect={() => go("/dashboard/sms")}>
                <MessageSquare className="h-4 w-4 mr-2" /> SMS
              </CommandItem>
            )}
            {hasPermission("users:read") && (
              <CommandItem onSelect={() => go("/dashboard/users")}>
                <Shield className="h-4 w-4 mr-2" /> Users
              </CommandItem>
            )}
            {hasPermission("settings:read") && (
              <CommandItem onSelect={() => go("/dashboard/settings")}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading="Actions">
            {hasPermission("sms:create") && (
              <CommandItem onSelect={() => go("/dashboard/sms/compose")}>
                <Plus className="h-4 w-4 mr-2" /> New SMS Campaign
              </CommandItem>
            )}
            {hasPermission("sms:read") && (
              <CommandItem onSelect={() => go("/dashboard/sms/templates")}>
                <FileText className="h-4 w-4 mr-2" /> SMS Templates
              </CommandItem>
            )}
            {hasPermission("attendance:create") && (
              <CommandItem onSelect={() => go("/dashboard/attendance")}>
                <Plus className="h-4 w-4 mr-2" /> Mark Attendance
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => { setTheme("light"); setOpen(false); }}>
              <Sun className="h-4 w-4 mr-2" /> Light theme
            </CommandItem>
            <CommandItem onSelect={() => { setTheme("dark"); setOpen(false); }}>
              <Moon className="h-4 w-4 mr-2" /> Dark theme
            </CommandItem>
            <CommandItem onSelect={() => { setTheme("system"); setOpen(false); }}>
              <Monitor className="h-4 w-4 mr-2" /> System theme
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Account">
            <CommandItem onSelect={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Ctx.Provider>
  );
}

"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { Button } from "@/components/ui/button";

export default function CommandPaletteTrigger() {
  const palette = useCommandPalette();
  if (!palette) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={palette.toggle}
      className="hidden md:inline-flex h-9 gap-2 text-muted-foreground font-normal pr-1.5"
      aria-label="Open command palette"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="text-xs">Search…</span>
      <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { getRecentActivity, type RecentActivity } from "@/app/dashboard/notifications-actions";

const STORAGE_KEY = "church-cms-last-seen-activity";

function iconFor(kind: RecentActivity["kind"]) {
  switch (kind) {
    case "sms":
      return MessageSquare;
    case "attendance":
      return Calendar;
  }
}

export default function NotificationBell() {
  const [items, setItems] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getRecentActivity();
        if (!alive) return;
        setItems(data);
        const lastSeen = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (data.length > 0 && lastSeen) {
          const seenAt = new Date(lastSeen).getTime();
          setUnread(data.filter(i => new Date(i.at).getTime() > seenAt).length);
        } else if (data.length > 0 && !lastSeen) {
          setUnread(data.length);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function markAllSeen() {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setUnread(0);
  }

  return (
    <Popover
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (o) markAllSeen();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-sm">Recent activity</div>
          {unread > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {unread} new
            </Badge>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No recent activity yet.
            </div>
          ) : (
            items.map(item => {
              const Icon = iconFor(item.kind);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

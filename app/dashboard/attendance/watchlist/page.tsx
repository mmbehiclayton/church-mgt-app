import { hasPermission } from "@/lib/rbac";
import { getWatchlist } from "../attendance-actions";
import WatchlistClient from "./WatchlistClient";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const canRead = await hasPermission("attendance", "read");
  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don&apos;t have permission to view the watchlist.
          </p>
        </div>
      </div>
    );
  }

  const watchlist = await getWatchlist();
  const canSms = await hasPermission("sms", "create");

  return (
    <WatchlistClient
      members={watchlist.map(m => ({
        ...m,
        lastAttended: m.lastAttended ? m.lastAttended.toISOString() : null,
      }))}
      canSms={canSms}
    />
  );
}

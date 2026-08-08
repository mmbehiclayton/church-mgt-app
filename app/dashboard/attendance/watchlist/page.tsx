import { hasPermission } from "@/lib/rbac";
import { getWatchlist } from "../attendance-actions";
import WatchlistClient from "./WatchlistClient";
import { AccessDenied } from "@/components/ui/access-denied";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const canRead = await hasPermission("attendance", "read");
  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <AccessDenied description="You don't have permission to view the watchlist." />
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

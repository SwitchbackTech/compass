import { getConnectionDelegation } from "@backend/common/services/sync-service/connection-routing";
import { getEventDelegation } from "@backend/common/services/sync-service/event-routing";

/**
 * Whether the legacy backend should create/repair Google push channels and
 * process `/api/sync/gcal/notifications`. When Sync owns connection or event
 * routing, Sync's `/sync/notifications/google` path is authoritative.
 */
export function isLegacyGoogleWatchOwner(): boolean {
  return (
    getConnectionDelegation() === "legacy" && getEventDelegation() === "legacy"
  );
}

import { CONFIG } from "@backend/common/constants/config.constants";

/**
 * Whether the legacy backend should create/repair Google push channels and
 * process `/api/sync/gcal/notifications`. When Sync owns connection or event
 * routing, Sync's `/sync/notifications/google` path is authoritative.
 */
export function isLegacyGoogleWatchOwner(): boolean {
  return (
    CONFIG.SYNC_CONNECTION_ROUTING === "legacy" &&
    CONFIG.SYNC_EVENT_ROUTING === "legacy"
  );
}

import { CONFIG } from "@backend/common/constants/config.constants";
import { SyncServiceClient } from "./sync-service.client";

// Build a client from an explicit URL + secret. Kept separate from the config
// singleton so it is testable without the global CONFIG.
export function buildSyncServiceClient(options: {
  serviceUrl: string;
  secret: string;
  timeoutMs?: number;
}): SyncServiceClient {
  return new SyncServiceClient({
    baseUrl: options.serviceUrl,
    secret: options.secret,
    timeoutMs: options.timeoutMs,
  });
}

let cached: SyncServiceClient | null | undefined;

// The process-wide client, built once from config. Returns null when Sync
// delegation is not configured (SYNC_SERVICE_URL / SYNC_INTERNAL_AUTH_TOKEN
// absent) — callers gate on it, so a legacy-only deployment simply never routes
// to Sync. Config validation guarantees the two values are present together.
export function getSyncServiceClient(): SyncServiceClient | null {
  if (cached !== undefined) return cached;
  const serviceUrl = CONFIG.SYNC_SERVICE_URL;
  const secret = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;
  cached =
    serviceUrl && secret
      ? buildSyncServiceClient({ serviceUrl, secret })
      : null;
  return cached;
}

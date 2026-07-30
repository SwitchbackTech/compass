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

// The process-wide client, built once from config. SYNC_SERVICE_URL and
// SYNC_INTERNAL_AUTH_TOKEN are required config, so this is null only in a
// test/mock CONFIG that bypasses the schema — every real deployment gets a
// real client. Callers still gate on it defensively rather than assume.
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

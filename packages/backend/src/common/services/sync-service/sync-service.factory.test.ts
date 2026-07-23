import { SyncServiceClient } from "./sync-service.client";
import {
  buildSyncServiceClient,
  getSyncServiceClient,
} from "./sync-service.factory";
import { describe, expect, it } from "bun:test";

describe("sync-service factory", () => {
  it("builds a client from an explicit url and secret", () => {
    const client = buildSyncServiceClient({
      serviceUrl: "http://localhost:3010",
      secret: "sync-internal-secret",
    });

    expect(client).toBeInstanceOf(SyncServiceClient);
  });

  it("returns null when Sync delegation is not configured", () => {
    // The backend test env sets no SYNC_SERVICE_URL / SYNC_INTERNAL_AUTH_TOKEN,
    // so a legacy-only deployment never routes to Sync.
    expect(getSyncServiceClient()).toBeNull();
  });
});

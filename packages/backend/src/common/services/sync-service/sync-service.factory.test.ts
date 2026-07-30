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

  it("returns a client built from the configured Sync service URL and secret", () => {
    // Sync is required config now (every deployment delegates to it), so the
    // process-wide singleton is always a real client, never null.
    expect(getSyncServiceClient()).toBeInstanceOf(SyncServiceClient);
  });
});

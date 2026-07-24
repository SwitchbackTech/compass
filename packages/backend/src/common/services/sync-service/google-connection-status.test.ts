import { type ConnectionListResponse } from "@core/types/sync/connection.contracts";
import { resolveGoogleConnectionStateFromSync } from "./google-connection-status";
import {
  type SyncClientResult,
  type SyncPrincipal,
} from "./sync-service.client";
import { describe, expect, it } from "bun:test";

const principal: SyncPrincipal = {
  tenantId: "64b7f9c2e1a2b3c4d5e6f7a8",
  principalId: "64b7f9c2e1a2b3c4d5e6f7a8",
};

// A minimal client stub whose listConnections returns a scripted result.
const clientReturning = (result: SyncClientResult<ConnectionListResponse>) => ({
  listConnections: async () => result,
});

const connection = (
  state: string,
  stateReason: string | null = null,
): ConnectionListResponse["connections"][number] =>
  ({
    id: "c1",
    tenantId: principal.tenantId,
    principalId: principal.principalId,
    provider: "google",
    account: { providerAccountId: "a1", email: null, displayName: null },
    capabilities: [],
    state,
    stateReason,
    lastSyncedAt: null,
    lastHealthyAt: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  }) as unknown as ConnectionListResponse["connections"][number];

describe("resolveGoogleConnectionStateFromSync", () => {
  it("translates a healthy connection to HEALTHY", async () => {
    const client = clientReturning({
      ok: true,
      value: { connections: [connection("healthy")] },
      correlationId: "corr-1",
    });

    expect(await resolveGoogleConnectionStateFromSync(client, principal)).toBe(
      "HEALTHY",
    );
  });

  it("reports NOT_CONNECTED when the principal has no connections", async () => {
    const client = clientReturning({
      ok: true,
      value: { connections: [] },
      correlationId: "corr-1",
    });

    expect(await resolveGoogleConnectionStateFromSync(client, principal)).toBe(
      "NOT_CONNECTED",
    );
  });

  it("surfaces ATTENTION when the sync service is unavailable", async () => {
    const client = clientReturning({
      ok: false,
      error: { kind: "unavailable", correlationId: "corr-1" },
    });

    expect(await resolveGoogleConnectionStateFromSync(client, principal)).toBe(
      "ATTENTION",
    );
  });

  it("surfaces ATTENTION on any client error kind (timeout, unauthorized, ...)", async () => {
    for (const kind of [
      "timeout",
      "unauthorized",
      "badRequest",
      "invalidResponse",
      "unexpectedStatus",
    ] as const) {
      const client = clientReturning({
        ok: false,
        error: { kind, correlationId: "corr-1" },
      });

      expect(
        await resolveGoogleConnectionStateFromSync(client, principal),
      ).toBe("ATTENTION");
    }
  });
});

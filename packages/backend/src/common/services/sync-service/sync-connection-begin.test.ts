import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { type ConnectionBeginResponse } from "@core/types/sync/connection.contracts";
import { beginSyncConnection } from "./sync-connection-begin";
import {
  type SyncClientResult,
  type SyncPrincipal,
} from "./sync-service.client";
import { describe, expect, it } from "bun:test";

const principal: SyncPrincipal = {
  tenantId: "64b7f9c2e1a2b3c4d5e6f7a8",
  principalId: "64b7f9c2e1a2b3c4d5e6f7a8",
};

const clientReturning = (
  result: SyncClientResult<ConnectionBeginResponse>,
) => ({
  beginConnection: async () => result,
});

describe("beginSyncConnection", () => {
  it("returns the authorization url when the sync service succeeds", async () => {
    const client = clientReturning({
      ok: true,
      value: {
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      },
      correlationId: "corr-1",
    });

    const result = await beginSyncConnection(client, principal, {});

    expect(result.authorizationUrl).toContain("accounts.google.com");
  });

  it("throws a 503 when the sync service is unavailable", async () => {
    const client = clientReturning({
      ok: false,
      error: { kind: "unavailable", correlationId: "corr-1" },
    });

    expect(beginSyncConnection(client, principal, {})).rejects.toMatchObject({
      statusCode: Status.SERVICE_UNAVAILABLE,
    });
  });

  it("maps every client error kind to a 503 without leaking sync internals", async () => {
    for (const kind of [
      "timeout",
      "unauthorized",
      "badRequest",
      "invalidResponse",
      "unexpectedStatus",
    ] as const) {
      const client = clientReturning({
        ok: false,
        error: { kind, status: 409, correlationId: "corr-1" },
      });

      let thrown: unknown;
      try {
        await beginSyncConnection(client, principal, {});
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(BaseError);
      expect((thrown as BaseError).statusCode).toBe(Status.SERVICE_UNAVAILABLE);
      // The sync error kind/status must not reach the browser-facing message.
      expect((thrown as BaseError).message).not.toContain(kind);
      expect((thrown as BaseError).message).not.toContain("409");
    }
  });
});

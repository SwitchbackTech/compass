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

  // Transient kinds get the retryable 503 (which logLevelForError logs at
  // `warn`, so a sync restart no longer files a GitHub issue). Everything
  // else must stay a 502 at `error` level, or a permanently broken sync -
  // drifted shared secret, broken response contract - would be invisible to
  // error tracking. Neither branch leaks the kind or status to the browser.
  it("maps each client error kind to the right opaque status", async () => {
    const expected = {
      timeout: Status.SERVICE_UNAVAILABLE,
      unavailable: Status.SERVICE_UNAVAILABLE,
      unauthorized: Status.BAD_GATEWAY,
      badRequest: Status.BAD_GATEWAY,
      notFound: Status.BAD_GATEWAY,
      conflict: Status.BAD_GATEWAY,
      invalidResponse: Status.BAD_GATEWAY,
      unexpectedStatus: Status.BAD_GATEWAY,
    } as const;

    for (const [kind, status] of Object.entries(expected)) {
      const client = clientReturning({
        ok: false,
        error: {
          kind: kind as keyof typeof expected,
          status: 409,
          correlationId: "corr-1",
        },
      });

      let thrown: unknown;
      try {
        await beginSyncConnection(client, principal, {});
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(BaseError);
      expect((thrown as BaseError).statusCode).toBe(status);
      // The sync error kind/status must not reach the browser-facing message.
      expect((thrown as BaseError).message).not.toContain(kind);
      expect((thrown as BaseError).message).not.toContain("409");
    }
  });
});

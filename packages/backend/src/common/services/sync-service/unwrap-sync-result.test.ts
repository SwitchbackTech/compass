import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { type SyncClientResult } from "./sync-service.client";
import { unwrapSyncResult } from "./unwrap-sync-result";
import { describe, expect, it } from "bun:test";

const logger = Logger("test:unwrap-sync-result");
const deps = {
  logger,
  logMessage: "Sync thing failed",
  userMessage: "Failed to do the thing",
};

describe("unwrapSyncResult", () => {
  it("returns the value on success", () => {
    const result: SyncClientResult<{
      enqueued: number;
      inFlight: number;
      resources: number;
    }> = {
      ok: true,
      value: { enqueued: 3, inFlight: 0, resources: 3 },
      correlationId: "corr-1",
    };

    expect(unwrapSyncResult(result, deps)).toEqual({
      enqueued: 3,
      inFlight: 0,
      resources: 3,
    });
  });

  const unwrapError = (result: SyncClientResult<void>): BaseError => {
    let thrown: unknown;
    try {
      unwrapSyncResult(result, deps);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(BaseError);
    return thrown as BaseError;
  };

  it("throws the retryable 503 when sync is momentarily unreachable", () => {
    const thrown = unwrapError({
      ok: false,
      error: { kind: "unavailable", status: 503, correlationId: "corr-1" },
    });

    expect(thrown.statusCode).toBe(Status.SERVICE_UNAVAILABLE);
    expect(thrown.isOperational).toBe(true);
    expect(thrown.result).toBe(deps.userMessage);
  });

  // A 503 is downgraded to a `warn` by logLevelForError so a sync restart
  // stops filing GitHub issues, which is only safe because a kind that means
  // "sync is genuinely broken" never lands on it. Flattening every kind to
  // 503 would hide a drifted internalAuthToken (`unauthorized`) or a broken
  // response contract (`invalidResponse`) from error tracking permanently.
  it("throws a 502, not the retryable 503, for a non-transient kind", () => {
    for (const kind of [
      "unauthorized",
      "invalidResponse",
      "unexpectedStatus",
    ] as const) {
      const thrown = unwrapError({
        ok: false,
        error: { kind, status: 401, correlationId: "corr-1" },
      });

      expect(thrown.statusCode).toBe(Status.BAD_GATEWAY);
      expect(thrown.code).toBe("SYNC_PROXY_FAILURE");
    }
  });

  it("hides the sync-internal error kind and status from the client", () => {
    const thrown = unwrapError({
      ok: false,
      error: { kind: "unauthorized", status: 401, correlationId: "corr-1" },
    });

    expect(thrown.result).toBe(deps.userMessage);
    expect(thrown.message).not.toContain("unauthorized");
    expect(thrown.message).not.toContain("401");
  });
});

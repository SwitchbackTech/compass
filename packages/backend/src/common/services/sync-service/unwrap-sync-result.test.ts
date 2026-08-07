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

  it("throws a 503 that hides the sync-internal error kind and status", () => {
    const result: SyncClientResult<void> = {
      ok: false,
      error: { kind: "unauthorized", status: 401, correlationId: "corr-1" },
    };

    let thrown: unknown;
    try {
      unwrapSyncResult(result, deps);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(BaseError);
    expect((thrown as BaseError).statusCode).toBe(Status.SERVICE_UNAVAILABLE);
    expect((thrown as BaseError).result).toBe(deps.userMessage);
    // Neither the internal description nor the client payload leaks the
    // sync-internal error kind or status.
    expect((thrown as BaseError).message).not.toContain("unauthorized");
    expect((thrown as BaseError).message).not.toContain("401");
  });
});

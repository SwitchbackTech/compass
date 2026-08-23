import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  throwSyncCommandSubmitFailure,
  throwSyncProxyFailure,
} from "@backend/common/services/sync-service/sync-proxy-error";
import {
  EventMutationException,
  toEventMutationError,
} from "@backend/event/event.error";
import { describe, expect, it } from "bun:test";

describe("toEventMutationError", () => {
  it("keeps PROVIDER_FAILURE retryable for typed mutation failures", () => {
    const mapped = toEventMutationError(
      new EventMutationException("PROVIDER_FAILURE", "provider blip"),
    );
    expect(mapped.status).toBe(502);
    expect(mapped.body.retryable).toBe(true);
  });

  it("maps unknown errors to non-retryable 500", () => {
    const mapped = toEventMutationError(new Error("boom"));
    expect(mapped.status).toBe(Status.INTERNAL_SERVER);
    expect(mapped.body).toEqual({
      code: "PROVIDER_FAILURE",
      message: "boom",
      retryable: false,
    });
  });
});

describe("sync-proxy-error", () => {
  it("maps unavailable Sync reads to 503, never 600", () => {
    try {
      throwSyncProxyFailure("unavailable", "calendars down");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BaseError);
      expect((e as BaseError).statusCode).toBe(Status.SERVICE_UNAVAILABLE);
      expect((e as BaseError).statusCode).not.toBe(Status.UNSURE);
    }
  });

  it("maps unexpected Sync reads to 502, never 600", () => {
    try {
      throwSyncProxyFailure("unexpectedStatus", "weird status");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BaseError);
      expect((e as BaseError).statusCode).toBe(Status.BAD_GATEWAY);
      expect((e as BaseError).statusCode).not.toBe(Status.UNSURE);
    }
  });

  // Backpressure from Sync is not a provider verdict. It used to surface as a
  // 502 on mutations while the read path already used 503, which made a Sync
  // throttle indistinguishable from a bad gateway in the logs (2026-08-23).
  it.each([
    "timeout",
    "unavailable",
  ] as const)("maps command submit %s to retryable SYNC_UNAVAILABLE 503", (kind) => {
    try {
      throwSyncCommandSubmitFailure(kind);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(EventMutationException);
      expect((e as EventMutationException).mutationCode).toBe(
        "SYNC_UNAVAILABLE",
      );
      const mapped = toEventMutationError(e);
      expect(mapped.status).toBe(Status.SERVICE_UNAVAILABLE);
      expect(mapped.body.retryable).toBe(true);
    }
  });

  it("still maps an unexpected command submit failure to PROVIDER_FAILURE 502", () => {
    try {
      throwSyncCommandSubmitFailure("unexpectedStatus");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(EventMutationException);
      expect((e as EventMutationException).mutationCode).toBe(
        "PROVIDER_FAILURE",
      );
      const mapped = toEventMutationError(e);
      expect(mapped.status).toBe(502);
      expect(mapped.body.retryable).toBe(true);
    }
  });
});

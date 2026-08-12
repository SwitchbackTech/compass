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

  it("maps command submit timeout to retryable PROVIDER_FAILURE", () => {
    try {
      throwSyncCommandSubmitFailure("timeout");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(EventMutationException);
      const mapped = toEventMutationError(e);
      expect(mapped.status).toBe(502);
      expect(mapped.body.retryable).toBe(true);
    }
  });
});

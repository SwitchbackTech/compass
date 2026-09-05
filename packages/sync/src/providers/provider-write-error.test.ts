import { ProviderWriteError } from "@sync/providers/provider-event-writer.port";
import {
  classifyProviderWriteError,
  isNotFoundStatus,
  type ProviderWriteErrorPolicy,
} from "@sync/providers/provider-write-error";
import { describe, expect, it } from "bun:test";

const policy: ProviderWriteErrorPolicy = {
  status: (error) => (error as { status?: number })?.status,
  cause: (error) =>
    new Error(`cause:${(error as { status?: number })?.status}`),
  credentialRejectedMessage: "Testly rejected the credential",
  writeRejectedMessage: "Testly rejected the write",
};

const classify = (status?: number): ProviderWriteError =>
  classifyProviderWriteError(status === undefined ? {} : { status }, policy);

describe("classifyProviderWriteError", () => {
  it("maps a failed precondition to a version conflict", () => {
    const error = classify(412);
    expect(error.reason).toBe("versionConflict");
    expect(error.message).toBe(
      "The event was modified since the expected version",
    );
  });

  it("maps 401 to a revoked authorization, named by the policy", () => {
    const error = classify(401);
    expect(error.reason).toBe("authorizationRevoked");
    expect(error.message).toBe("Testly rejected the credential");
  });

  it("maps 403 to a read-only calendar", () => {
    expect(classify(403).reason).toBe("readOnlyCalendar");
  });

  it("treats a missing status, 429 and every 5xx as transient", () => {
    for (const status of [undefined, 429, 500, 503, 599]) {
      expect(classify(status).reason).toBe("transient");
    }
  });

  it("maps any other 4xx to a permanent rejection, named by the policy", () => {
    const error = classify(400);
    expect(error.reason).toBe("permanentProviderError");
    expect(error.message).toBe("Testly rejected the write");
  });

  it("carries the policy's cause through", () => {
    expect(classify(400).cause).toEqual(new Error("cause:400"));
  });

  it("returns a ProviderWriteError so instanceof narrowing still works", () => {
    expect(classify(412)).toBeInstanceOf(ProviderWriteError);
    expect(classify(412).name).toBe("ProviderWriteError");
  });
});

describe("isNotFoundStatus", () => {
  it("accepts the two statuses that mean the event is gone", () => {
    expect(isNotFoundStatus(404)).toBe(true);
    expect(isNotFoundStatus(410)).toBe(true);
  });

  it("rejects everything else, including a missing status", () => {
    for (const status of [undefined, 200, 400, 403, 412, 500]) {
      expect(isNotFoundStatus(status)).toBe(false);
    }
  });
});

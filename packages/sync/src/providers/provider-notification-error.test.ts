import {
  classifyProviderWatchError,
  type ProviderWatchErrorPolicy,
} from "@sync/providers/provider-notification-error";
import { ProviderNotificationError } from "@sync/providers/provider-notifications.port";
import { describe, expect, it } from "bun:test";

const policy: ProviderWatchErrorPolicy = {
  status: (error) => (error as { status?: number })?.status,
  cause: (error) =>
    new Error(`cause:${(error as { status?: number })?.status}`),
  isTransient: (_error, status) =>
    status === undefined || status === 429 || status >= 500,
  isWatchUnsupported: (error) =>
    (error as { unsupported?: boolean }).unsupported === true,
  credentialRejectedMessage: "Testly rejected the credential",
  watchUnsupportedMessage: "Testly does not support watching this resource",
  transientUnavailableMessage: "Testly watch temporarily unavailable",
  watchFailedMessage: "Testly refused to open the channel",
};

const classify = (
  status?: number,
  extras?: { unsupported?: boolean },
): ProviderNotificationError =>
  classifyProviderWatchError(
    status === undefined ? { ...extras } : { status, ...extras },
    policy,
  );

describe("classifyProviderWatchError", () => {
  it("maps 401 to a revoked authorization, preferring the cause message", () => {
    const error = classify(401);
    expect(error.reason).toBe("authorizationRevoked");
    expect(error.message).toBe("cause:401");
  });

  it("falls back to the policy credential message when the cause has none", () => {
    const error = classifyProviderWatchError(
      { status: 401 },
      { ...policy, cause: () => undefined },
    );
    expect(error.reason).toBe("authorizationRevoked");
    expect(error.message).toBe("Testly rejected the credential");
  });

  it("maps an unsupported watch to watchUnsupported", () => {
    const error = classify(400, { unsupported: true });
    expect(error.reason).toBe("watchUnsupported");
    expect(error.message).toBe("cause:400");
  });

  it("treats a missing status, 429 and every 5xx as transient", () => {
    for (const status of [undefined, 429, 500, 503, 599]) {
      const error = classify(status);
      expect(error.reason).toBe("transient");
      expect(error.message).toBe(
        `Testly watch temporarily unavailable (cause:${status})`,
      );
    }
  });

  it("maps any other 4xx to a durable watch failure", () => {
    const error = classify(403);
    expect(error.reason).toBe("watchFailed");
    expect(error.message).toBe(
      "Testly refused to open the channel (cause:403)",
    );
  });

  it("returns a thrown ProviderNotificationError unchanged", () => {
    const original = new ProviderNotificationError("watchFailed", "already");
    expect(classifyProviderWatchError(original, policy)).toBe(original);
  });

  it("returns a ProviderNotificationError so instanceof narrowing still works", () => {
    expect(classify(401)).toBeInstanceOf(ProviderNotificationError);
    expect(classify(401).name).toBe("ProviderNotificationError");
  });
});

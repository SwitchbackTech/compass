import { verifyNotification } from "@sync/notifications/notification-verification";
import {
  type NotificationSubscription,
  type ProviderNotification,
} from "@sync/providers/provider-notifications.port";

const now = new Date("2026-01-01T00:00:00Z");

const subscription = (
  overrides: Partial<NotificationSubscription> = {},
): NotificationSubscription => ({
  channelId: "chan-1",
  resourceId: "res-1",
  token: "secret-token",
  expiresAt: new Date("2026-01-02T00:00:00Z"),
  ...overrides,
});

const notification = (
  overrides: Partial<ProviderNotification> = {},
): ProviderNotification => ({
  channelId: "chan-1",
  resourceId: "res-1",
  token: "secret-token",
  state: "changed",
  ...overrides,
});

describe("verifyNotification", () => {
  it("accepts an authentic change and asks the caller to process it", () => {
    const verdict = verifyNotification(notification(), subscription(), now);
    expect(verdict).toEqual({ status: "process" });
  });

  it("accepts the initial handshake but marks it a no-op", () => {
    const verdict = verifyNotification(
      notification({ state: "initialSync" }),
      subscription(),
      now,
    );
    expect(verdict).toEqual({ status: "ignore" });
  });

  it("rejects a callback for a channel with no stored subscription", () => {
    const verdict = verifyNotification(notification(), null, now);
    expect(verdict).toEqual({ status: "rejected", reason: "unknownChannel" });
  });

  it("rejects when the subscription is for a different channel id", () => {
    const verdict = verifyNotification(
      notification({ channelId: "chan-other" }),
      subscription(),
      now,
    );
    expect(verdict).toEqual({ status: "rejected", reason: "unknownChannel" });
  });

  it("rejects a spoofed token", () => {
    const verdict = verifyNotification(
      notification({ token: "wrong-token" }),
      subscription(),
      now,
    );
    expect(verdict).toEqual({ status: "rejected", reason: "tokenMismatch" });
  });

  it("rejects a callback that carries no token at all", () => {
    const verdict = verifyNotification(
      notification({ token: null }),
      subscription(),
      now,
    );
    expect(verdict).toEqual({ status: "rejected", reason: "tokenMismatch" });
  });

  it("rejects a callback naming a different resource than was subscribed", () => {
    const verdict = verifyNotification(
      notification({ resourceId: "res-other" }),
      subscription(),
      now,
    );
    expect(verdict).toEqual({ status: "rejected", reason: "resourceMismatch" });
  });

  it("rejects a callback for a subscription that has already expired", () => {
    const verdict = verifyNotification(
      notification(),
      subscription({ expiresAt: new Date("2025-12-31T23:59:59Z") }),
      now,
    );
    expect(verdict).toEqual({ status: "rejected", reason: "expired" });
  });
});

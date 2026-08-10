import { deriveBillingStatus } from "./billing.service";
import { describe, expect, it } from "bun:test";

describe("deriveBillingStatus", () => {
  const now = new Date("2026-08-10T00:00:00.000Z");

  it("returns none when no billing record exists", () => {
    expect(deriveBillingStatus(undefined, now)).toEqual({
      subscriptionStatus: "none",
      trialEndsAt: null,
      isReadOnly: false,
    });
  });

  it("returns trialing and writable while the trial window is open", () => {
    const trialEndsAt = new Date("2026-08-20T00:00:00.000Z");
    const status = deriveBillingStatus(
      {
        subscriptionStatus: "trialing",
        trialStartedAt: new Date("2026-08-06T00:00:00.000Z"),
        trialEndsAt,
      },
      now,
    );

    expect(status).toEqual({
      subscriptionStatus: "trialing",
      trialEndsAt: trialEndsAt.toISOString(),
      isReadOnly: false,
    });
  });

  it("flips to expired and read-only once the trial end date has passed", () => {
    const trialEndsAt = new Date("2026-08-01T00:00:00.000Z");
    const status = deriveBillingStatus(
      {
        subscriptionStatus: "trialing",
        trialStartedAt: new Date("2026-07-18T00:00:00.000Z"),
        trialEndsAt,
      },
      now,
    );

    expect(status).toEqual({
      subscriptionStatus: "expired",
      trialEndsAt: trialEndsAt.toISOString(),
      isReadOnly: true,
    });
  });

  it("treats exactly-at-boundary as expired", () => {
    const trialEndsAt = now;
    const status = deriveBillingStatus(
      { subscriptionStatus: "trialing", trialEndsAt },
      now,
    );

    expect(status.subscriptionStatus).toBe("expired");
    expect(status.isReadOnly).toBe(true);
  });
});

import {
  isStaleLocalTrialingRow,
  resolveSubscriptionStatus,
} from "./resolve-subscription-status";
import { describe, expect, it } from "bun:test";

const NOW = new Date("2026-10-05T12:00:00.000Z");

describe("resolveSubscriptionStatus", () => {
  it("passes through non-trialing stored statuses", () => {
    expect(
      resolveSubscriptionStatus({ subscriptionStatus: "active" }, NOW),
    ).toBe("active");
  });

  it("does not expire a Stripe-backed trial after trialEndsAt", () => {
    expect(
      resolveSubscriptionStatus(
        {
          subscriptionStatus: "trialing",
          stripeSubscriptionId: "sub_1",
          trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        NOW,
      ),
    ).toBe("trialing");
  });

  it("keeps an in-window card-less local trial trialing", () => {
    expect(
      resolveSubscriptionStatus(
        {
          subscriptionStatus: "trialing",
          trialEndsAt: new Date("2026-10-10T00:00:00.000Z"),
        },
        NOW,
      ),
    ).toBe("trialing");
  });

  it("expires a card-less local trial after trialEndsAt", () => {
    expect(
      resolveSubscriptionStatus(
        {
          subscriptionStatus: "trialing",
          trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
        },
        NOW,
      ),
    ).toBe("expired");
  });

  it("maps a card-less trialing row without trialEndsAt to awaiting_checkout", () => {
    expect(
      resolveSubscriptionStatus({ subscriptionStatus: "trialing" }, NOW),
    ).toBe("awaiting_checkout");
  });
});

describe("isStaleLocalTrialingRow", () => {
  it("is false for active local trials and Stripe-backed trials", () => {
    expect(
      isStaleLocalTrialingRow(
        {
          subscriptionStatus: "trialing",
          trialEndsAt: new Date("2026-10-10T00:00:00.000Z"),
        },
        NOW,
      ),
    ).toBe(false);
    expect(
      isStaleLocalTrialingRow(
        {
          subscriptionStatus: "trialing",
          stripeSubscriptionId: "sub_1",
          trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is true when a card-less local trial should no longer be trialing", () => {
    expect(
      isStaleLocalTrialingRow(
        {
          subscriptionStatus: "trialing",
          trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
        },
        NOW,
      ),
    ).toBe(true);
  });
});

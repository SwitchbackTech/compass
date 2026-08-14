import { type BillingSubscriptionStatus } from "@core/types/user.types";
import { WRITE_ACCESS_BY_STATUS } from "@backend/billing/billing.constants";
import { deriveBillingStatus } from "./billing.service";
import { describe, expect, it } from "bun:test";

describe("deriveBillingStatus", () => {
  const now = new Date("2026-08-10T00:00:00.000Z");

  it("treats a missing billing record as awaiting_checkout", () => {
    expect(deriveBillingStatus(undefined, now)).toEqual({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
    });
  });

  it("treats none as awaiting_checkout", () => {
    expect(deriveBillingStatus({ subscriptionStatus: "none" }, now)).toEqual({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
    });
  });

  it("treats a local trialing record with no Stripe subscription as awaiting_checkout", () => {
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
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: trialEndsAt.toISOString(),
      isReadOnly: true,
    });
  });

  it("treats an expired local trialing record as awaiting_checkout, not expired", () => {
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
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: trialEndsAt.toISOString(),
      isReadOnly: true,
    });
  });

  it("does not self-expire a Stripe-backed trialing record past trialEndsAt", () => {
    const trialEndsAt = new Date("2026-08-01T00:00:00.000Z");
    const status = deriveBillingStatus(
      {
        subscriptionStatus: "trialing",
        trialEndsAt,
        stripeSubscriptionId: "sub_123",
      },
      now,
    );

    expect(status.subscriptionStatus).toBe("trialing");
    expect(status.isReadOnly).toBe(false);
  });

  const cases: Array<{
    status: BillingSubscriptionStatus;
    isReadOnly: boolean;
  }> = (
    Object.entries(WRITE_ACCESS_BY_STATUS) as Array<
      [BillingSubscriptionStatus, boolean]
    >
  )
    .filter(([status]) => status !== "none")
    .map(([status, writable]) => ({
      status,
      isReadOnly: !writable,
    }));

  for (const { status, isReadOnly } of cases) {
    it(`maps ${status} writability from WRITE_ACCESS_BY_STATUS`, () => {
      const derived = deriveBillingStatus(
        {
          subscriptionStatus: status,
          trialEndsAt: new Date("2026-09-01T00:00:00.000Z"),
          ...(status === "trialing"
            ? { stripeSubscriptionId: "sub_keep_open" }
            : {}),
        },
        now,
      );

      expect(derived.subscriptionStatus).toBe(status);
      expect(derived.isReadOnly).toBe(isReadOnly);
    });
  }
});

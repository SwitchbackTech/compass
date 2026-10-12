import {
  type BillingSubscriptionStatus,
  type Schema_UserBilling,
} from "@core/types/user.types";
import { WRITE_ACCESS_BY_STATUS } from "@backend/billing/billing.constants";
import { deriveBillingStatus } from "./billing.service";
import { describe, expect, it } from "bun:test";

describe("deriveBillingStatus", () => {
  it("treats a missing billing record as awaiting_checkout", () => {
    expect(deriveBillingStatus(undefined)).toEqual({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
      cancelAtPeriodEnd: false,
    });
  });

  it("treats none as awaiting_checkout", () => {
    expect(deriveBillingStatus({ subscriptionStatus: "none" })).toEqual({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
      cancelAtPeriodEnd: false,
    });
  });

  it("treats a billing object with a customer id but no status as awaiting_checkout", () => {
    expect(
      deriveBillingStatus({
        stripeCustomerId: "cus_partial",
      } as Schema_UserBilling),
    ).toEqual({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
      cancelAtPeriodEnd: false,
    });
  });

  it("surfaces a scheduled cancel on a Stripe-backed trial", () => {
    const status = deriveBillingStatus({
      subscriptionStatus: "trialing",
      trialEndsAt: new Date("2026-09-08T00:00:00.000Z"),
      stripeSubscriptionId: "sub_123",
      cancelAtPeriodEnd: true,
    });

    expect(status.subscriptionStatus).toBe("trialing");
    expect(status.cancelAtPeriodEnd).toBe(true);
  });

  it("does not self-expire a Stripe-backed trialing record past trialEndsAt", () => {
    const trialEndsAt = new Date("2026-08-01T00:00:00.000Z");
    const status = deriveBillingStatus({
      subscriptionStatus: "trialing",
      trialEndsAt,
      stripeSubscriptionId: "sub_123",
    });

    expect(status.subscriptionStatus).toBe("trialing");
    expect(status.isReadOnly).toBe(false);
  });

  it("expires a card-less local trial after trialEndsAt", () => {
    const now = new Date("2026-10-05T12:00:00.000Z");
    const status = deriveBillingStatus(
      {
        subscriptionStatus: "trialing",
        trialStartedAt: new Date("2026-09-28T00:00:00.000Z"),
        trialEndsAt: new Date("2026-10-04T00:00:00.000Z"),
      },
      now,
    );

    expect(status).toEqual({
      subscriptionStatus: "expired",
      trialEndsAt: "2026-10-04T00:00:00.000Z",
      isReadOnly: true,
      cancelAtPeriodEnd: false,
    });
  });

  it("maps a card-less trialing row without trialEndsAt to awaiting_checkout", () => {
    expect(
      deriveBillingStatus({
        subscriptionStatus: "trialing",
        trialStartedAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).toEqual({
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: null,
      isReadOnly: true,
      cancelAtPeriodEnd: false,
    });
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
      const derived = deriveBillingStatus({
        subscriptionStatus: status,
        trialEndsAt: new Date("2026-09-01T00:00:00.000Z"),
        ...(status === "trialing"
          ? { stripeSubscriptionId: "sub_keep_open" }
          : {}),
      });

      expect(derived.subscriptionStatus).toBe(status);
      expect(derived.isReadOnly).toBe(isReadOnly);
    });
  }
});

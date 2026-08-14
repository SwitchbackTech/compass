import { type BillingStatusResponse } from "@core/types/billing.types";
import { type Schema_UserBilling } from "@core/types/user.types";
import {
  BILLING_PLAN,
  WRITE_ACCESS_BY_STATUS,
} from "@backend/billing/billing.constants";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Pure status derivation. Writability is a total map over the status union
 * so adding a state without deciding it is a compile error.
 *
 * A hosted trial starts only via Stripe Checkout. Missing billing, a billing
 * object with no `subscriptionStatus`, `none`, and `trialing` with no
 * `stripeSubscriptionId` (legacy / backfill local trials) all surface as
 * `awaiting_checkout` so the Start-trial gate shows.
 *
 * `trialing` with a `stripeSubscriptionId` never self-expires locally —
 * Stripe's webhook is authoritative, so a late `active` event cannot lock
 * out a customer whose card just succeeded.
 */
export const deriveBillingStatus = (
  billing: Schema_UserBilling | undefined,
  _now: Date,
): BillingStatusResponse => {
  const storedStatus = billing?.subscriptionStatus;
  if (!billing || !storedStatus || storedStatus === "none") {
    return {
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: billing?.trialEndsAt?.toISOString() ?? null,
      isReadOnly: true,
    };
  }

  if (
    billing.subscriptionStatus === "trialing" &&
    !billing.stripeSubscriptionId
  ) {
    return {
      subscriptionStatus: "awaiting_checkout",
      trialEndsAt: billing.trialEndsAt?.toISOString() ?? null,
      isReadOnly: true,
    };
  }

  return {
    subscriptionStatus: billing.subscriptionStatus,
    trialEndsAt: billing.trialEndsAt?.toISOString() ?? null,
    isReadOnly: !WRITE_ACCESS_BY_STATUS[billing.subscriptionStatus],
  };
};

class BillingService {
  /**
   * Field-level `$set` so existing Stripe ids are never clobbered.
   * Not exposed over HTTP — a trial starts only via Stripe Checkout.
   */
  startTrial = async (userId: string): Promise<BillingStatusResponse> => {
    const _id = mongoService.objectId(userId);
    const now = new Date();

    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_PLAN.TRIAL_LENGTH_DAYS);

    const result = await mongoService.user.findOneAndUpdate(
      {
        _id,
        $or: [
          { "billing.trialStartedAt": { $exists: false } },
          { "billing.trialStartedAt": null },
        ],
      },
      {
        $set: {
          "billing.subscriptionStatus": "trialing",
          "billing.trialStartedAt": now,
          "billing.trialEndsAt": trialEndsAt,
        },
      },
      { returnDocument: "after" },
    );

    if (result) {
      return deriveBillingStatus(result.billing, now);
    }

    const user = await mongoService.user.findOne({ _id });
    if (!user) {
      throw new Error("User not found");
    }

    return deriveBillingStatus(user.billing, now);
  };

  getStatus = async (userId: string): Promise<BillingStatusResponse> => {
    const user = await mongoService.user.findOne({
      _id: mongoService.objectId(userId),
    });
    if (!user) {
      throw new Error("User not found");
    }

    return deriveBillingStatus(user.billing, new Date());
  };
}

export default new BillingService();

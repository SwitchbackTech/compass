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
 * Date override (asymmetric on purpose):
 * - `trialing` with no `stripeSubscriptionId` (legacy / backfill) self-expires
 *   when `trialEndsAt <= now`.
 * - `trialing` with a `stripeSubscriptionId` never self-expires locally —
 *   Stripe's webhook is authoritative, so a late `active` event cannot lock
 *   out a customer whose card just succeeded.
 */
export const deriveBillingStatus = (
  billing: Schema_UserBilling | undefined,
  now: Date,
): BillingStatusResponse => {
  if (!billing || billing.subscriptionStatus === "none") {
    return {
      subscriptionStatus: "none",
      trialEndsAt: null,
      isReadOnly: !WRITE_ACCESS_BY_STATUS.none,
    };
  }

  const trialEndsAt = billing.trialEndsAt ?? null;
  let subscriptionStatus = billing.subscriptionStatus;

  if (subscriptionStatus === "trialing" && !billing.stripeSubscriptionId) {
    const trialExpired =
      trialEndsAt !== null && trialEndsAt.getTime() <= now.getTime();
    if (trialExpired) {
      subscriptionStatus = "expired";
    }
  }

  return {
    subscriptionStatus,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    isReadOnly: !WRITE_ACCESS_BY_STATUS[subscriptionStatus],
  };
};

class BillingService {
  /**
   * Starts a trial once per user; a second call is a no-op that just
   * returns the existing state, so retried/duplicate CTA clicks can never
   * push the trial window out further. Uses a conditional update so two
   * concurrent POSTs cannot both write a new trialStartedAt.
   *
   * Field-level `$set` so existing Stripe ids are never clobbered.
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

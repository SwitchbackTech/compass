import { type BillingStatusResponse } from "@core/types/billing.types";
import { type Schema_UserBilling } from "@core/types/user.types";
import { BILLING_DEFAULTS } from "@backend/billing/billing.constants";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Pure status derivation: a trial past its end date reads as expired even
 * before anything writes that back to the document. Keeps `getStatus` a
 * simple read with no write-on-read race to reason about.
 */
export const deriveBillingStatus = (
  billing: Schema_UserBilling | undefined,
  now: Date,
): BillingStatusResponse => {
  if (!billing || billing.subscriptionStatus === "none") {
    return { subscriptionStatus: "none", trialEndsAt: null, isReadOnly: false };
  }

  const trialEndsAt = billing.trialEndsAt ?? null;
  const trialExpired =
    trialEndsAt !== null && trialEndsAt.getTime() <= now.getTime();

  if (billing.subscriptionStatus === "trialing" && !trialExpired) {
    return {
      subscriptionStatus: "trialing",
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      isReadOnly: false,
    };
  }

  return {
    subscriptionStatus: "expired",
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    isReadOnly: true,
  };
};

class BillingService {
  /**
   * Starts a trial once per user; a second call is a no-op that just
   * returns the existing state, so retried/duplicate CTA clicks can never
   * push the trial window out further.
   */
  startTrial = async (userId: string): Promise<BillingStatusResponse> => {
    const user = await mongoService.user.findOne({
      _id: mongoService.objectId(userId),
    });
    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();

    if (user.billing?.trialStartedAt) {
      return deriveBillingStatus(user.billing, now);
    }

    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(
      trialEndsAt.getDate() + BILLING_DEFAULTS.TRIAL_LENGTH_DAYS,
    );

    const billing: Schema_UserBilling = {
      subscriptionStatus: "trialing",
      trialStartedAt: now,
      trialEndsAt,
    };

    await mongoService.user.updateOne(
      { _id: mongoService.objectId(userId) },
      { $set: { billing } },
    );

    return deriveBillingStatus(billing, now);
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

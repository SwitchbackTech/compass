import { type BillingCheckoutResponse } from "@core/types/billing.types";
import {
  BILLING_PLAN,
  getStripePriceId,
} from "@backend/billing/billing.constants";
import { getStripeClient } from "@backend/billing/services/stripe.client";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isStripeConfigured } from "@backend/common/constants/config.util";
import mongoService from "@backend/common/services/mongo.service";

const checkoutReturnUrl = (outcome: "success" | "cancel"): string => {
  const url = new URL(CONFIG.FRONTEND_URL);
  url.searchParams.set("checkout", outcome);
  return url.toString();
};

class StripeService {
  createCheckoutSession = async (
    userId: string,
  ): Promise<BillingCheckoutResponse> => {
    if (!isStripeConfigured(CONFIG)) {
      throw new Error("Stripe is not configured");
    }

    const _id = mongoService.objectId(userId);
    const user = await mongoService.user.findOne({ _id });
    if (!user) {
      throw new Error("User not found");
    }

    const liveStatus = user.billing?.subscriptionStatus;
    const hasOpenStripeSubscription =
      Boolean(user.billing?.stripeSubscriptionId) &&
      Boolean(user.billing?.stripeCustomerId) &&
      (liveStatus === "trialing" ||
        liveStatus === "active" ||
        liveStatus === "past_due" ||
        liveStatus === "awaiting_checkout");
    if (hasOpenStripeSubscription) {
      return this.createPortalSession(userId);
    }

    const stripe = getStripeClient();
    let customerId = user.billing?.stripeCustomerId;
    const grantTrial = !user.billing?.stripeSubscriptionId;

    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { compassUserId: userId },
        },
        { idempotencyKey: `compass-customer-${userId}` },
      );
      customerId = customer.id;
      await mongoService.user.updateOne(
        { _id },
        { $set: { "billing.stripeCustomerId": customerId } },
      );
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: getStripePriceId(), quantity: 1 }],
        subscription_data: {
          ...(grantTrial
            ? { trial_period_days: BILLING_PLAN.TRIAL_LENGTH_DAYS }
            : {}),
          metadata: { compassUserId: userId },
        },
        success_url: checkoutReturnUrl("success"),
        cancel_url: checkoutReturnUrl("cancel"),
      },
      grantTrial ? { idempotencyKey: `compass-checkout-${userId}` } : undefined,
    );

    if (!session.url) {
      throw new Error("Stripe Checkout did not return a URL");
    }

    return { url: session.url };
  };

  createPortalSession = async (
    userId: string,
  ): Promise<BillingCheckoutResponse> => {
    if (!isStripeConfigured(CONFIG)) {
      throw new Error("Stripe is not configured");
    }

    const _id = mongoService.objectId(userId);
    const user = await mongoService.user.findOne({ _id });
    if (!user) {
      throw new Error("User not found");
    }

    const customerId = user.billing?.stripeCustomerId;
    if (!customerId) {
      throw new Error("User not found");
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: CONFIG.FRONTEND_URL,
    });

    return { url: session.url };
  };
}

export default new StripeService();

import { type BillingCheckoutResponse } from "@core/types/billing.types";
import {
  BILLING_PLAN,
  getStripePriceId,
} from "@backend/billing/billing.constants";
import { wrapStripeFailure } from "@backend/billing/billing.errors";
import { getStripeClient } from "@backend/billing/services/stripe.client";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isStripeConfigured } from "@backend/common/constants/config.util";
import mongoService from "@backend/common/services/mongo.service";

/** Bump when Checkout Session create params change so Stripe does not replay a failed create. */
const CHECKOUT_IDEMPOTENCY_PREFIX = "compass-checkout-v2-";

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
      const customer = await stripe.customers
        .create(
          {
            email: user.email,
            metadata: { compassUserId: userId },
          },
          { idempotencyKey: `compass-customer-${userId}` },
        )
        .catch(wrapStripeFailure);
      customerId = customer.id;
      await mongoService.user.updateOne(
        { _id },
        {
          $set: {
            "billing.stripeCustomerId": customerId,
            ...(!user.billing?.subscriptionStatus ||
            user.billing.subscriptionStatus === "none"
              ? { "billing.subscriptionStatus": "awaiting_checkout" }
              : {}),
          },
        },
      );
    }

    const session = await stripe.checkout.sessions
      .create(
        {
          mode: "subscription",
          customer: customerId,
          client_reference_id: userId,
          line_items: [{ price: getStripePriceId(), quantity: 1 }],
          // Card is required to start the trial. Default is `always`, but pin
          // it so a Dashboard setting cannot silently skip collection.
          payment_method_collection: "always",
          subscription_data: {
            ...(grantTrial
              ? {
                  trial_period_days: BILLING_PLAN.TRIAL_LENGTH_DAYS,
                  trial_settings: {
                    end_behavior: { missing_payment_method: "cancel" },
                  },
                }
              : {}),
            metadata: { compassUserId: userId },
          },
          success_url: checkoutReturnUrl("success"),
          cancel_url: checkoutReturnUrl("cancel"),
        },
        grantTrial
          ? { idempotencyKey: `${CHECKOUT_IDEMPOTENCY_PREFIX}${userId}` }
          : undefined,
      )
      .catch(wrapStripeFailure);

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
    const session = await stripe.billingPortal.sessions
      .create({
        customer: customerId,
        return_url: CONFIG.FRONTEND_URL,
      })
      .catch(wrapStripeFailure);

    return { url: session.url };
  };
}

export default new StripeService();

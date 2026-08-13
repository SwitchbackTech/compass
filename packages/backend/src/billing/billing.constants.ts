import { BILLING_PLAN } from "@core/constants/billing.constants";
import { type BillingSubscriptionStatus } from "@core/types/user.types";
import { CONFIG } from "@backend/common/constants/config.constants";

export { BILLING_PLAN };

export const STRIPE_WEBHOOK_PATH = "/api/billing/webhook/stripe";

/**
 * Stripe Subscription.Status values for the pinned API version in
 * stripe.client.ts. A new Stripe status is a type error against
 * `Stripe.Subscription.Status` there.
 */
export type StripeSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export const STRIPE_TO_COMPASS_STATUS: Record<
  StripeSubscriptionStatus,
  BillingSubscriptionStatus
> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  incomplete: "awaiting_checkout",
  incomplete_expired: "expired",
  canceled: "canceled",
  unpaid: "expired",
  paused: "expired",
};

export const WRITE_ACCESS_BY_STATUS: Record<
  BillingSubscriptionStatus,
  boolean
> = {
  none: true,
  awaiting_checkout: false,
  trialing: true,
  active: true,
  past_due: true,
  canceled: false,
  expired: false,
};

export function getStripePriceId(): string {
  const priceId = CONFIG.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }
  return priceId.trim();
}

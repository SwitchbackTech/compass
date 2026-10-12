import { type BillingSubscriptionStatus } from "@core/types/user.types";

/** Billing fields needed to resolve a stored row to an effective status. */
export type BillingStatusInput = {
  subscriptionStatus: BillingSubscriptionStatus;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
};

/**
 * Maps a stored Compass billing row to the status clients and guards should
 * trust. Stripe-backed trials stay on the stored value until webhooks move
 * them. Card-less local trials (signup stamped `trialing` before WP-06) expire
 * into `expired` when `trialEndsAt` passes, or `awaiting_checkout` when the
 * end date was never recorded.
 */
export function resolveSubscriptionStatus(
  billing: BillingStatusInput,
  now: Date = new Date(),
): BillingSubscriptionStatus {
  const stored = billing.subscriptionStatus;
  if (stored !== "trialing" || billing.stripeSubscriptionId) {
    return stored;
  }

  if (!billing.trialEndsAt) {
    return "awaiting_checkout";
  }

  return billing.trialEndsAt.getTime() <= now.getTime()
    ? "expired"
    : "trialing";
}

export function isStaleLocalTrialingRow(
  billing: BillingStatusInput,
  now: Date = new Date(),
): boolean {
  if (
    billing.subscriptionStatus !== "trialing" ||
    billing.stripeSubscriptionId
  ) {
    return false;
  }
  return resolveSubscriptionStatus(billing, now) !== "trialing";
}

import Stripe from "stripe";
import { type StripeSubscriptionStatus } from "@backend/billing/billing.constants";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isStripeConfigured } from "@backend/common/constants/config.util";

/**
 * Pinned Stripe API version. `Stripe.Subscription.Status` must stay equal to
 * `StripeSubscriptionStatus` or the exhaustiveness assignment below fails.
 */
export const STRIPE_API_VERSION = "2025-08-27.basil" as const;

type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
const _stripeStatusIsTotal: AssertEqual<
  Stripe.Subscription.Status,
  StripeSubscriptionStatus
> = true;
void _stripeStatusIsTotal;

let client: Stripe | undefined;
let clientOverride: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (clientOverride) return clientOverride;
  if (!isStripeConfigured(CONFIG) || !CONFIG.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  if (!client) {
    client = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return client;
}

export function setStripeClientForTests(next: Stripe | undefined): void {
  clientOverride = next;
  client = undefined;
}

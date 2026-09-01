import { z } from "zod/v4";
import { type BillingSubscriptionStatus } from "./user.types";

export const BillingSubscriptionStatusSchema = z.enum([
  "none",
  "awaiting_checkout",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
]);

/** Wire shape: dates are ISO strings, matching every other JSON API response. */
export const BillingStatusResponseSchema = z.object({
  subscriptionStatus: BillingSubscriptionStatusSchema,
  trialEndsAt: z.string().nullable(),
  /** True when the account must not mutate events. */
  isReadOnly: z.boolean(),
  /**
   * True when the subscription is set to cancel at period end instead of
   * renewing. Defaulted so a response from an older server still parses.
   */
  cancelAtPeriodEnd: z.boolean().default(false),
});
export type BillingStatusResponse = z.infer<typeof BillingStatusResponseSchema>;

export const BillingCheckoutResponseSchema = z.object({
  url: z.string().url(),
});
export type BillingCheckoutResponse = z.infer<
  typeof BillingCheckoutResponseSchema
>;

export const BillingPortalResponseSchema = z.object({
  url: z.string().url(),
});
export type BillingPortalResponse = z.infer<typeof BillingPortalResponseSchema>;

export type { BillingSubscriptionStatus };

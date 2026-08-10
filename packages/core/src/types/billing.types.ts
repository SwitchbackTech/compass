import { type BillingSubscriptionStatus } from "./user.types";

/** Wire shape: dates are ISO strings, matching every other JSON API response. */
export interface BillingStatusResponse {
  subscriptionStatus: BillingSubscriptionStatus;
  trialEndsAt: string | null;
  /** True once the trial has ended with no active subscription. */
  isReadOnly: boolean;
}

import {
  BILLING_PLAN,
  type BillingDisplayPrice,
} from "@core/constants/billing.constants";
import { type BillingSubscriptionResponse } from "@core/types/billing.types";
import { formatBillingMoney } from "@web/billing/billing-display";

export type ResolvedBillingPrice = BillingDisplayPrice;

export function resolveBillingDisplayPrice(
  subscriptionPrice: BillingSubscriptionResponse["price"] | null | undefined,
): ResolvedBillingPrice {
  if (subscriptionPrice) {
    return subscriptionPrice;
  }
  return BILLING_PLAN.DISPLAY_PRICE;
}

const INTERVAL_SHORT: Record<BillingDisplayPrice["interval"], string> = {
  day: "day",
  week: "wk",
  month: "mo",
  year: "yr",
};

/** Trial ask copy: "$12/mo after 7 days. Cancel anytime in Settings." */
export function formatTrialStartPriceLine(
  price: ResolvedBillingPrice,
  trialLengthDays: number = BILLING_PLAN.TRIAL_LENGTH_DAYS,
): string {
  const money = formatBillingMoney(price.amount, price.currency);
  const interval = INTERVAL_SHORT[price.interval];
  return `${money}/${interval} after ${trialLengthDays} days. Cancel anytime in Settings.`;
}

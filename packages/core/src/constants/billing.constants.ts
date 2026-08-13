/**
 * Trial and pricing terms. Kept in core so web copy and backend Checkout
 * share one source. The Stripe price id is a deployment secret and lives
 * in config, not here.
 *
 * BACKFILL_CUTOFF is the single dated switch for "not grandfathered":
 * existing accounts signed up on or before this instant are placed on a
 * trial. Reverting to grandfathering is a one-line change to this value
 * (or dropping the cutoff predicate in the backfill command).
 */
export const BILLING_PLAN = {
  TRIAL_LENGTH_DAYS: 7,
  PLAN_NAME: "Compass",
  PRICE_AMOUNT_CENTS: 800,
  PRICE_CURRENCY: "usd",
  PRICE_DISPLAY: "$8/month",
  BACKFILL_CUTOFF: "2026-08-13T00:00:00.000Z",
} as const;

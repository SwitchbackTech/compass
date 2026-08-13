/**
 * Trial and pricing terms. Kept in core so web copy and backend Checkout
 * share one source. The Stripe price id is a deployment secret and lives
 * in config, not here.
 *
 * BACKFILL_CUTOFF is the single dated switch for grandfathering: only
 * accounts with `signedUpAt <= cutoff` (or missing `signedUpAt`) are
 * placed on a trial. A far-future default means nobody is grandfathered.
 * Reverting to grandfathering is a one-line change to this value.
 */
export const BILLING_PLAN = {
  TRIAL_LENGTH_DAYS: 7,
  PLAN_NAME: "Compass",
  PRICE_AMOUNT_CENTS: 799,
  PRICE_CURRENCY: "usd",
  PRICE_DISPLAY: "$7.99/month",
  BACKFILL_CUTOFF: "2099-12-31T23:59:59.000Z",
} as const;

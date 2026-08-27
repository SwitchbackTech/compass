/**
 * Trial and pricing terms. Kept in core so web copy and backend Checkout
 * share one source. The Stripe price id is a deployment secret and lives
 * in config, not here.
 *
 * BACKFILL_CUTOFF bounds which rows `backfill-billing` stamps: only
 * accounts with `signedUpAt <= cutoff` (or missing `signedUpAt`) are
 * stamped `awaiting_checkout`. It is NOT a grandfathering switch --
 * `deriveBillingStatus` gates a missing `billing` object through the same
 * read-only branch, so skipping a row here changes nothing about its
 * access. Grandfathering would need a real code change.
 */
export const BILLING_PLAN = {
  TRIAL_LENGTH_DAYS: 7,
  PLAN_NAME: "Compass",
  PRICE_AMOUNT_CENTS: 799,
  PRICE_CURRENCY: "usd",
  PRICE_DISPLAY: "$7.99/month",
  BACKFILL_CUTOFF: "2099-12-31T23:59:59.000Z",
} as const;

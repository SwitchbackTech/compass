/**
 * Placeholder trial/pricing terms, set 2026-08-10 to unblock implementation
 * (see compass-calendar-internal/projects/keyboard-education/03-monetization-trial-checkout.md).
 * Every value here is expected to change in the founder's post-ship pricing
 * sweep -- kept in one module, not scattered literals, so that sweep is a
 * small diff instead of a re-implementation.
 */
export const BILLING_DEFAULTS = {
  // Aligned with the client-side anonymous trial clock (packages/web/src/billing/trial.storage.ts).
  TRIAL_LENGTH_DAYS: 7,
} as const;

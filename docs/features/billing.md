# Billing And Trial

Hosted Compass uses Stripe Checkout (subscription mode, 7-day trial, $8/month)
and the Stripe Billing Portal. There is no Stripe.js and no publishable key in
the web bundle.

Self-host installs omit the `stripe:` config block. `/api/config` then reports
`billing.isConfigured: false`, the web never shows a paid gate, and event
writes stay open.

## What users see

- **Never signed up:** the existing 7-day anonymous `localStorage` trial and
  `TrialGateModal`. Unchanged.
- **Signed up, no card yet:** `awaiting_checkout`, read-only, `BillingGateModal`
  with Subscribe (Stripe Checkout).
- **Trialing / active / past_due:** writable. `past_due` also shows a banner.
- **Expired / canceled:** read-only until they subscribe again. A later
  Checkout does not grant another trial.

There is no `POST /api/billing/trial/start`. A trial only begins through
Stripe Checkout (`trial_period_days` on the first subscription).

Existing accounts are not grandfathered. `bun run cli backfill-billing` places
rows without `billing.subscriptionStatus` onto a 7-day trial. The default
`BACKFILL_CUTOFF` is far in the future so every such row is included; set it
to a past instant to grandfather newer signups. Those rows have no Stripe
subscription id, so they self-expire locally when `trialEndsAt` passes.

## Staging

Set `STRIPE_SECRET_KEY` (restricted `rk_test_...`), `STRIPE_WEBHOOK_SECRET`,
and `STRIPE_PRICE_ID` on the `staging-cloud` GitHub Environment. Config-only
deploys need `./compass restart`. Confirm `/api/config` shows
`billing.isConfigured: true`.

`staging-selfhosted` must not get those secrets — it is the live regression
that self-host stays writable.

Sales tax (`automatic_tax`) is a Stripe Dashboard decision, not a code one,
and should be settled before production keys.

## Key files

- Plan/price copy: `packages/core/src/constants/billing.constants.ts`
- Status derivation: `packages/backend/src/billing/services/billing.service.ts`
- Checkout / portal: `packages/backend/src/billing/services/stripe.service.ts`
- Webhook: `packages/backend/src/billing/services/billing.webhook.service.ts`
- Write guard: `packages/backend/src/billing/billing.guard.ts`
- Web access: `packages/web/src/billing/useAppAccess.ts`

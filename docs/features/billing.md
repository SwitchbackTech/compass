# Billing And Trial

Hosted Compass uses Stripe Checkout (subscription mode, 7-day trial, $7.99/month)
and the Stripe Billing Portal. There is no Stripe.js and no publishable key in
the web bundle.

Self-host installs omit the `stripe:` config block. `/api/config` then reports
`billing.isConfigured: false`, the web never shows a paid gate, and event
writes stay open.

## Pausing enforcement

`billing.enforcement` is a separate, independent switch — the operator's global
kill switch for turning the whole trial/billing product on or off, regardless
of whether Stripe is configured. It defaults to `false` (paused): every user,
signed in or not, sees `{kind: "open"}` from `useAppAccess`, no chip, no gate
modal, no `localStorage` clock stamp, and `assertBillingAllowsWrites` no-ops
even with valid Stripe keys present. This lets Stripe keys and Checkout/webhook
work stay live in an environment while the product feels free to every user.

Set it via `billing.enforcement: true` in `compass.yaml`, or the
`BILLING_ENFORCEMENT` GitHub Environment var for hosted deploys. Flipping it
requires a redeploy (or `./compass restart` if the yaml is already current) —
it is read once at backend startup, not polled. Web-side, it flows through
`/api/config`, which is fetched asynchronously and fails open: a pending or
errored config request always reads as paused, never as enforced, so a slow
network never flashes a gate at a user before the real value loads.

**Enable-day caveat:** existing signed-in accounts are not grandfathered (see
below) — flipping `enforcement: true` while Stripe is configured immediately
puts any hosted user without a Stripe subscription id into `awaiting_checkout`
and shows them `BillingGateModal`. Neither `backfill-billing` nor
`BACKFILL_CUTOFF` changes that — see below. Sparing existing users would take
a real code change, so treat the flip as the moment every hosted account
without a Stripe subscription goes read-only.

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

Existing accounts are not grandfathered. Hosted users without a Stripe
subscription id (including missing billing, `none`, and local/backfill
`trialing` rows) derive as `awaiting_checkout` and see the Start-trial gate.
`bun run cli backfill-billing` stamps `awaiting_checkout` on rows that still
lack `billing.subscriptionStatus`. The default `BACKFILL_CUTOFF` is far in
the future so every such row is included; set it to a past instant to skip
newer signups.

`BACKFILL_CUTOFF` is **not** a grandfathering switch. It only decides which
rows get *stamped*, and `deriveBillingStatus` already gates a missing
`billing` object through the same `awaiting_checkout` branch — so stamped and
unstamped rows are equally read-only. Running the backfill makes the state
explicit for reporting; it grants nobody access. A trial only begins through
Stripe Checkout.

## Staging

Set `STRIPE_SECRET_KEY` (`sk_test_...` is fine), `STRIPE_WEBHOOK_SECRET`,
and `STRIPE_PRICE_ID` on the `staging-cloud` GitHub Environment, then
**re-run Deploy staging** so `~/compass/compass.yaml` is rewritten. A restart
on old yaml will not pick up new secrets. Confirm `/api/config` shows
`billing.isConfigured: true`.

The webhook endpoint (`https://staging.compasscalendar.com/api/billing/webhook/stripe`)
must subscribe to Checkout and Subscriptions snapshot events, not Accounts v2:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

`staging-selfhosted` must not get those secrets — it is the live regression
that self-host stays writable.

Sales tax is enabled in code: the Checkout Session passes
`automatic_tax`, `customer_update.address`, and `billing_address_collection`
together (all three are required when an existing `customer` is passed). The
Dashboard half is the part that must be settled before production keys —
register each jurisdiction under Tax > Registrations and set a product tax
code, in test and live mode separately. Without a registration Stripe
calculates zero tax rather than erroring, so a missing one is silent.

## Key files

- Plan/price copy: `packages/core/src/constants/billing.constants.ts`
- Status derivation: `packages/backend/src/billing/services/billing.service.ts`
- Checkout / portal: `packages/backend/src/billing/services/stripe.service.ts`
- Webhook: `packages/backend/src/billing/services/billing.webhook.service.ts`
- Write guard: `packages/backend/src/billing/billing.guard.ts`
- Web access: `packages/web/src/billing/useAppAccess.ts`

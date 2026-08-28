# Billing And Trial

Hosted Compass uses Stripe Checkout (subscription mode, 7-day trial)
and the Stripe Billing Portal. The subscription amount lives on the Stripe
Price behind `stripe.priceId`, so operators can change it in Stripe without
a web deploy. There is no Stripe.js and no publishable key in the web bundle.

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
`BACKFILL_CUTOFF` changes that — see below. Sparing a whole cohort would take
a real code change, so treat the flip as the moment every hosted account
without a Stripe subscription goes read-only. Individual accounts can be
exempted, though — see the next section.

## Bypassing enforcement for specific accounts

`billing.bypassEmails` is a narrower escape hatch than the global pause: a list
of email addresses that skip the gate while enforcement stays genuinely on for
everyone else. It exists for test accounts that cannot complete a real Stripe
Checkout — staging smoke checks, QA sweeps, automated sessions verifying a
change against a deployed environment.

```yaml
billing:
  enforcement: true
  bypassEmails: ["qa@example.com"]
```

Hosted deploys set the `BILLING_BYPASS_EMAILS` GitHub Environment var to a
comma-separated list; the deploy workflow writes it into the remote yaml. Like
`enforcement`, it is read once at backend startup — the backend logs
`Billing bypass: N account(s)` on boot so a redeploy can be confirmed.

Two places consult the list, both after the enforcement and Stripe-configured
checks, so it can only ever narrow access:

- `assertBillingAllowsWrites` returns early, so event writes succeed.
- `GET /api/billing/status` reports `active` / `isReadOnly: false`, so
  `useAppAccess` resolves to a writable server session and `RootShell` renders
  the app instead of `BillingGateModal`.

Matching is case- and whitespace-insensitive. Nothing is written to the user
document — the account's stored `billing` is untouched, so removing an address
from the list restores the real gate on the next restart.

The roster is deliberately **not** exposed through `/api/config`: that payload
is public and unauthenticated, and putting addresses in it would leak the list.
Only the signed-in account learns it is bypassed.

**This is a real payment bypass.** It is operator config only, never
user-supplied, and empty by default. Set it on staging; leave it unset in
production.

## What users see

- **Never signed up:** fully open, forever. Anonymous visitors get the seeded
  sample events and the whole app with no clock and no gate. There is no
  browser-local trial: a trial is only ever asked for at the moment of
  commitment (sign up, sign in, connect an account).
- **Signed up, no card yet:** `awaiting_checkout`, read-only,
  `BillingGateModal` with Start trial (Stripe Checkout). The gate also offers
  "Look around first", which unmounts it and drops the user onto the real
  calendar behind `BillingReadOnlyBanner`. That preview lives in
  `billing-preview.store.ts` and is deliberately in-memory, so a reload puts
  the trial ask back. Writes still fail server-side, and the
  `BILLING_REQUIRED` branch in `useEventMutations` exits the preview, so the
  first refused save brings the gate straight back. That refusal does not
  show the catch-all "something went wrong" toast — the gate is the feedback.
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

- Trial length: `packages/core/src/constants/billing.constants.ts`
- Status derivation: `packages/backend/src/billing/services/billing.service.ts`
- Checkout / portal: `packages/backend/src/billing/services/stripe.service.ts`
- Webhook: `packages/backend/src/billing/services/billing.webhook.service.ts`
- Write guard: `packages/backend/src/billing/billing.guard.ts`
- Web access: `packages/web/src/billing/useAppAccess.ts`
- Read-only look-around: `packages/web/src/billing/billing-preview.store.ts`

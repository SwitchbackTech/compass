# WP-08 — Public booking page

**task_id:** WP-08
**github:** [#2977](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2977)
**status:** queued
**owner:** Implementer (web)
**depends on:** WP-06
**next owner after done:** WP-09

## Why

The guest URL is the product. It must not boot the authenticated
keyboard-first calendar. Route:
[`packages/web/src/routers/router.routes.tsx`](../../packages/web/src/routers/router.routes.tsx)
and [`packages/web/src/common/constants/routes.ts`](../../packages/web/src/common/constants/routes.ts).

## Finish line

1. Public route `/book/$username` on the root route (not under
   `authenticated`). `lazyRouteComponent` loads a booking-only view.
   RootShell/auth/calendar stores must not initialize on this path.
   Prove with a test that the week grid / shortcut overlay is absent.
2. States:
   - Loading
   - Not found / disabled (generic, no leak)
   - Host temporarily unavailable (`bookable: false`)
   - Slot picker: dates/times in **guest browser timezone**, labeled as
     such; duration from the public page
   - Form: name, email, optional notes
   - Confirmation: time + cancel instruction
   - Cancel result page if you reuse the same route family
     (`/book/$username/cancel` or query token) — pick one, keep it
     public and small
3. Confirm uses POST reservation; `409` tells the guest to pick
   another slot and refreshes slots.
4. Semantic HTML, visible focus, Tailwind semantic colors, no
   em-dashes in copy ("This time is no longer available.").
5. `bun test:web`, type-check, lint, knip. Router tests updated so
   `/book/tylerdane` is not swallowed by `authenticated` or NotFound.

## Steps

1. Read `router.routes.tsx` and `loaders.ts`. Public route must not
   call `loadAuthenticated`.
2. Bundle: keep booking views under `packages/web/src/booking/` (or
   similar) imported only from the booking route.
3. MSW handlers for public booking APIs.
4. Tests: unknown slug empty state; slot click + name/email submit;
   409 path; timezone label present.
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** guest sees host display name and duration, picks a slot,
  submits, sees confirmation.
- **Incomplete input:** submit without email blocked by the form.
- **Tool failure:** `bookable: false` shows unavailable, not a blank
  week.
- **Policy:** visiting `/book/x` while signed out does not redirect to
  login.

## Evidence

Fill when implementing.

## Out of scope

- Host Settings (WP-07)
- e2e Playwright (WP-09)

## Risks

- `RootShell` currently wraps every route. If it always loads auth,
  split a lighter shell for public booking rather than stuffing
  conditions through the calendar app. Document the choice.

## Handoff

```yaml
task_id: WP-08
from:
to: Implementer (web)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-08 from
wip/booking/WP-08-public-booking-page.md in the Compass repo. Read
wip/booking/README.md, TRACKING.md, docs/features/booking.md first.
Mark WP-08 running, commit the ledger, implement only this WP.

Finish line: public /book/$username lazy bundle without authenticated
calendar shell; slot picker in guest TZ; form; confirm; 409; 404;
unavailable. bun test:web, type-check, lint, knip. Fill Evidence, push,
PR to main.
```

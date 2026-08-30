# WP-06 — Public book, confirm, and cancel APIs

**task_id:** WP-06
**github:** [#2975](https://github.com/KeepSoftwareSimple/compass-calendar/issues/2975)
**status:** queued
**owner:** Implementer (backend)
**depends on:** WP-03, WP-04, WP-05
**next owner after done:** WP-08

## Why

Guests have no SuperTokens session. These routes are the product. They
must rate-limit, fail closed, and never leak the host's other events.

Key files: `packages/backend/src/booking/` public routes (no
`verifySession()`). Register distinctly from admin routes.

## Finish line

1. Unauthenticated:
   - `GET /api/booking/pages/:slug` → `PublicBookingPageSchema`. `404`
     when missing or `enabled: false` (same status; do not leak
     disabled vs missing).
   - `GET /api/booking/pages/:slug/slots?start=&end=&timeZone=` —
     computes via WP-04 using WP-05 availability. If Sync
     `bookable` is false, return `200 { slots: [], bookable: false }`
     (or a typed `503`/`409` — pick one, document; **confirm** must
     still reject). Prefer empty slots + `bookable: false` so the UI
     can say the host is temporarily unavailable without looking like
     an empty calendar.
   - `POST /api/booking/pages/:slug/reservations` — body from WP-01.
     Re-query busy with `booking_confirmation`, recompute that the
     requested start is still in `computeBookingSlots`, then
     `createBookingEvent`, then insert reservation (`confirmed`) with
     hashed cancel token. Return reservation id, times, and cancel
     token **once**.
   - `POST /api/booking/reservations/:id/cancel` with `{ token }`.
     Constant-time compare of hash. Deletes the calendar event, marks
     cancelled. Second call succeeds without a second delete.
2. Rate limit public GET slots and POST confirm per IP + slug.
   Reuse existing backend rate-limit middleware if one exists; otherwise
   add a small limiter on these routes only.
3. Confirm races: unique constraint or equivalent so two confirms for
   the same page+start cannot both insert. Loser `409`.
4. Never return busy interval payloads, calendar ids, or other
   attendees to the guest.
5. `bun test:backend` db tests cover the four routes with faked
   CalendarBookingPort. type-check, lint, knip, test:core green.

## Steps

1. Read WP-01 HTTP schemas, WP-03 records, WP-04 function, WP-05 port.
2. Hash cancel tokens (sha256 of a 32-byte random). Store only the
   hash; return the raw token once on create.
3. Tests: happy confirm; confirm when bookable false → 409 and **no**
   event create; slot not in engine output → 409; disabled slug 404;
   cancel idempotent; rate-limit test if practical (or document the
   limiter config).
4. No web UI in this WP.
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** confirm creates reservation + port.createBookingEvent
  called once with guest, Meet flag, guestsCanInviteOthers from page.
- **Incomplete input:** invalid email `400`; slot in the past `409`.
- **Tool failure:** Sync bookable false → 409, zero create calls.
- **Policy:** GET slots JSON has no `intervals` from Sync and no
  event titles.

## Evidence

Fill when implementing.

## Out of scope

- Web pages (WP-07/08)
- Compass email

## Risks

- Do not `verifySession()` accidentally on public routes.
- Cancel token in the event description is the raw token, not the hash.

## Handoff

```yaml
task_id: WP-06
from:
to: Implementer (backend)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-06 from
wip/booking/WP-06-public-booking-api.md in the Compass repo. Read
wip/booking/README.md, TRACKING.md, docs/features/booking.md first.
Mark WP-06 running, commit the ledger, implement only this WP.

Finish line: unauthenticated GET page, GET slots, POST reservation,
POST cancel; fail-closed confirm; hashed cancel token; 404 for
disabled/missing; rate limit; no busy content leak. bun test:backend,
core, type-check, lint, knip. Fill Evidence, push, PR to main.
```

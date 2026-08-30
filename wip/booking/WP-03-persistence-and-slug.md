# WP-03 — Booking persistence and slug

**task_id:** WP-03
**status:** queued
**owner:** Implementer (backend)
**depends on:** WP-01
**next owner after done:** WP-06 (API) and WP-07 (Settings UI)

## Why

Booking owns its collections. The host must be able to enable a page,
get a stable slug, and replace settings. No public guest flow yet.

Follow backend pattern: `routes.config.ts` -> controller -> service ->
query/mongo. See
[`docs/architecture/repo-architecture.md`](../../docs/architecture/repo-architecture.md).

Key files (create under `packages/backend/src/booking/`):

- routes, controller, service, queries/records
- register routes from the Express server next to other route configs

Reuse:

- [`packages/backend/src/user/`](../../packages/backend/src/user/) for
  host name/email when allocating a slug
- billing write gate (`assertBillingAllowsWrites`) on PUT
- session `verifySession()` on admin routes only

## Finish line

1. Booking-owned Mongo collections (names like `booking_pages`,
   `booking_reservations`). Only the booking module writes them. Unique
   index on `bookingSlug`; unique index on `{userId}` so one page per
   user.
2. Authenticated `GET /api/booking/page` and `PUT /api/booking/page`.
   PUT create-or-replace. First PUT with `enabled: true` allocates slug
   via `allocateBookingSlug` and never changes it later (slug field on
   PUT is ignored or rejected if present and different).
3. `403` when the user has no healthy Google connection, or the
   destination calendar is not writable, or billing forbids writes.
   Typed error, not a generic 500.
4. Password-only / not-connected users can `GET` a not-yet-created
   page document (empty defaults) so Settings can render the
   connect-Google prompt. They cannot enable.
5. Reservations collection exists (schema from WP-01) but has no
   public write path yet. Indexes for `{pageId, slotStart}` and
   `{pageId, status, slotStart}` to support max-per-day later.
6. `bun test:backend` (or focused booking db tests +
   `test:backend:fast` if the full suite has a documented pre-existing
   baseline — record that baseline). `bun test:core`, type-check, lint,
   knip green.

## Steps

1. Read WP-01 contracts and an existing module such as
   `packages/backend/src/contacts/` or `calendar/` for route
   registration.
2. Implement records with Mongo-native dates/ObjectIds; map to Zod
   wire types at the controller boundary.
3. Tests: slug uniqueness and reserved collision suffix; slug
   immutability on second PUT; enable without Google `403`; billing
   gate; GET before any PUT returns defaults without inserting a row
   (or inserts disabled — pick one, document in Evidence).
4. Do not add `/book/` web routes.
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** PUT enabled page persists duration, calendars, weekly
  hours, timezone, window, buffer, cap, guestsCanInviteOthers; GET
  returns the allocated slug.
- **Incomplete input:** destination calendar missing `403`/`400`;
  overlapping weekly intervals `400`.
- **Tool failure:** Mongo down surfaces the existing backend error
  mapper, not a hang.
- **Policy:** second user cannot take the first user's slug; changing
  display name does not rewrite slug.

## Evidence

Fill when implementing.

## Out of scope

- Public unauthenticated routes (WP-06)
- Slot engine (WP-04)
- Creating calendar events

## Risks

- Slug allocation must be unique under concurrency. Use a unique index
  and retry on duplicate-key, not a check-then-insert.

## Handoff

```yaml
task_id: WP-03
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
You are implementing WP-03 from
wip/booking/WP-03-persistence-and-slug.md in the Compass repo. Read
wip/booking/README.md, TRACKING.md, docs/features/booking.md, and
WP-01 contracts first. Mark WP-03 running, commit the ledger, implement
only this WP.

Finish line: booking_pages + booking_reservations collections; auth
GET/PUT /api/booking/page; slug allocated once; 403 without Google /
non-writable destination / billing; unique index retry. bun
test:backend (document baseline), test:core, type-check, lint, knip.
Fill Evidence, push, PR to main.
```

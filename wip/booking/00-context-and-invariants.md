# Compass Booking — context, decisions, invariants

Read once before your first WP. Skip if your WP is already unambiguous.

Do not re-litigate the design. The product spec is
[`docs/features/booking.md`](../../docs/features/booking.md), approved
2026-08-30.

## Where the codebase is today

- **No booking module.** Public routes in
  [`packages/web/src/routers/router.routes.tsx`](../../packages/web/src/routers/router.routes.tsx)
  are `/life`, authenticated `/week`/`/day`, Google callback, and (dev)
  `/cleanup`. There is no `/book/$username`.
- **Users have no slug.**
  [`packages/core/src/types/user.types.ts`](../../packages/core/src/types/user.types.ts)
  has `name` / `email` / `firstName` / `lastName`.
- **Sync already has a busy query** intended for booking confirmation:
  `POST /internal/availability/busy` with `purpose: "booking_confirmation"`
  ([`packages/core/src/types/sync/availability.contracts.ts`](../../packages/core/src/types/sync/availability.contracts.ts),
  [`packages/sync/src/server/connection.routes.ts`](../../packages/sync/src/server/connection.routes.ts)).
  The response is intervals + freshness/`complete`/`bookable`. Event
  titles never appear. Booking policy (hours, buffers, which calendars
  block) is explicitly the caller's.
- **Occurrence `busy` is currently a lie.**
  [`toOccurrence`](../../packages/sync/src/domain/occurrence-projection.ts)
  hardcodes `busy: true`. Google already maps
  `transparency !== "transparent"` onto `ProviderEvent.busy`
  ([`google-event.normalizer.ts`](../../packages/sync/src/providers/google/google-event.normalizer.ts)).
  The page applier stores only the free case:
  `providerMetadata.transparency = "transparent"`
  ([`provider-page-applier.ts`](../../packages/sync/src/domain/provider-page-applier.ts)).
- **Browser availability is display-only.**
  `GET /api/calendars/availability` uses a 24h max-age and ignores
  `bookable` ([`calendar.controller.ts`](../../packages/backend/src/calendar/controllers/calendar.controller.ts)).
  Do not reuse that endpoint for confirm.
- **Event create already supports attendees + invitation emails**
  (attendee-support pack). Meet create and `guestsCanInviteOthers` are
  **not** written today:
  [`toGoogleBody`](../../packages/sync/src/providers/google/google-event-writer.adapter.ts)
  documents that conference is read-reflected only.
- **Settings** has Accounts and Billing only
  ([`settings.store.ts`](../../packages/web/src/settings/settings.store.ts)).
- **Architecture map** already names Booking:
  [`docs/architecture/product-suite-boundaries.md`](../../docs/architecture/product-suite-boundaries.md).
  First slice: booking module in the existing API, public web routes,
  Calendar application interfaces. Do not extract a microservice.

## Invariants that must survive every WP

1. Sync busy responses never carry event titles, descriptions,
   attendees, conference URLs, or other content
   ([`packages/core/src/types/sync/busy.contracts.ts`](../../packages/core/src/types/sync/busy.contracts.ts)
   and the availability wire twin). Public booking APIs inherit this:
   guests see slots, never the host's other meetings.
2. [`packages/sync/src/safety/safety-canary.ts`](../../packages/sync/src/safety/safety-canary.ts)
   stays green. Sync WPs state "safety-canary tests pass" in Evidence.
3. Confirm fail-closed: `bookable !== true` means reject. Never book
   over unverified busy data.
4. Booking does not write Calendar/Sync collections. It calls a Calendar
   application interface (`getAvailability`, `createEvent`,
   `deleteEvent`).
5. Public `/book/` routes and `/api/booking/pages/*` do not require a
   SuperTokens session and must not boot the authenticated calendar
   bundle.
6. No barrel files; alias imports; Zod shared contracts in
   `packages/core`; RTL semantic queries; Tailwind semantic colors; no
   em-dashes in user-facing copy (see [`AGENTS.md`](../../AGENTS.md)).
7. Legacy event create/replace payloads stay byte-identical unless a
   WP is explicitly adding a new optional create flag with a default
   that preserves today's behavior.

## Product decisions (approved 2026-08-30 — do not re-litigate)

1. Public URL is `/book/:username`, not `/p/:username`.
2. One booking page per user, one duration.
3. Guest: name, email, optional notes. Browser timezone for display.
4. Google Meet is auto-added on the created event.
5. Guest cancel via tokenized link. No reschedule (cancel + rebook).
6. Occupancy is Sync busy/transparency, not RSVP-strict filtering.
7. Host admin is a Settings page, not a separate host app.
8. Slug from display name, immutable in v1.
9. Standalone booking product is deferred.

## Named warts (documented, accepted for v1)

- Confirm race: two guests can request the same slot; the second
  fail-closed confirm is a `409`. There is no hold/lock collection in
  v1 beyond "re-query busy then create".
- Transparency lives in `providerMetadata`, not on Sync event content.
  WP-02 threads that fact into occurrence `busy` rather than adding a
  new content field.
- Google auto-adds the organizer as an accepted attendee on create
  (same wart as attendees.md).
- Fetch→patch race on provider writes is unchanged from attendees v1.

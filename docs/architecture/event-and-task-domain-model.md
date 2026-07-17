# Event Domain Model

The event domain is the most cross-cutting part of Compass. Read this before changing event shape, recurrence logic, sync behavior, or local persistence.

## Current Contracts (sub-calendar v1)

The runtime uses the strict calendar-owned contracts everywhere: Mongo
storage, the HTTP API, SSE, IndexedDB, and the web data/state layers. The
pre-cutover legacy event model (and its `event.legacy-bridge.ts` conversion
shim) has been fully removed — the sections below describe the current model
only.

- `packages/core/src/types/domain-primitives.ts` — branded ids, `DateOnly`,
  `DateTime` (RFC 3339 with offset), `TimeZone`, `SortOrder`, `RRule`.
- `packages/core/src/types/event.contracts.ts` — canonical `Event`: required
  `calendarId`, discriminated `content` (`details` | `busy`), `schedule`
  (`timed` | `allDay`, exclusive all-day ends), `recurrence`
  (`single` | `series` | `occurrence`), plus `BusyPeriod` for free/busy-only
  calendars.
- `packages/core/src/types/event-command.contracts.ts` — create (optional
  client id), full-replace, delete, list and availability queries.
- `packages/core/src/types/calendar.contracts.ts` — `Calendar` read model with
  provider/access and derived capabilities (`getCalendarCapabilities`).
- `packages/core/src/types/server-message.contracts.ts` — the discriminated
  SSE union every backend publish site must emit.
- `packages/backend/src/calendar/calendar.record.ts`,
  `packages/backend/src/event/event.record.ts` — Mongo record shapes
  (ObjectIds/BSON dates, single nullable `externalReference`, no `origin`).
- `packages/backend/src/event/google-event.adapter.ts` — Google↔record
  mapping; provider writes are `events.patch` bodies.
- `packages/web/src/events/event-draft.types.ts` + `event-draft.parser.ts` —
  the only intentionally incomplete event shape and the single parser that can
  turn it into a command.

## Deferred Beyond V1

These are scoped out of the sub-calendar v1 contracts above, not overlooked.
Each line names the decision in the project's
[master doc](https://github.com/SwitchbackTech/compass-calendar/blob/90696e1dd9b279f7f1c56be0cef93b8b9c5787fe/team/archive/google-subcalendar-project/master-doc.md)'s
assumption log (archived after v1 shipped — see
`compass-calendar-internal/projects/google-subcalendars/master-doc.md`) that anchors
the carve-out, so a future v2 effort starts from the recorded reasoning instead of
rediscovering it:

- **Cross-calendar event moves.** An existing event's `calendarId` is
  immutable once created (A6) — creating and duplicating pick a calendar,
  editing shows it as read-only text, and there is no move control. General
  cross-calendar moves need their own Google and recurrence
  semantics (what happens to a moved recurring series, a moved event's
  provider identity) that v1 never had to answer.
- **Non-Google providers.** `Calendar` and event provider identity are
  discriminated unions with exactly one live member: Google (plus the
  Compass-local calendar) (A1, A23). Outlook and iCalendar adapters would add
  new discriminant members rather than change the shape — the extension point
  is deliberately in place, but no second adapter is implemented.
- **Shared-calendar administration.** Compass reads Google's CalendarList and
  lets a user change Compass-local visibility, but never creates, deletes, or
  manages sharing/ACLs on a provider calendar (A1, A15). Calendar lifecycle
  stays server-owned and Google-authoritative in v1.
- **Per-event Google colors.** Compass models calendar identity as an
  accent/marker plus text label, while an event card's fill stays a single
  flat neutral color (A9) — there is no per-event color field in
  `event.contracts.ts` anywhere, so Google's per-event `colorId` overrides are
  neither imported nor exposed. Surfacing them would need a second color
  dimension on the card that A9 deliberately avoided.

## Core Event Schema

Primary source:

- `packages/core/src/types/event.contracts.ts`

Important event fields:

- `id`: Compass event id
- `calendarId`: required, immutable once created (see Deferred Beyond V1)
- `content`: discriminated union — `details` (`title` + `description`) or
  `busy` (free/busy-only calendars)
- `schedule`: discriminated union — `timed` (`start`/`end`/`timeZone`) or
  `allDay` (`DateOnly` `start`/`end`, exclusive end)
- `recurrence`: discriminated union — `single` (standalone event), `series`
  (recurring base, carries `rules`), or `occurrence` (references its parent
  via `seriesId`)
- `createdAt`, `updatedAt`

The backend record shape (`packages/backend/src/event/event.record.ts`) mirrors
this with Mongo-native types (`ObjectId`, `Date`) plus a single nullable
`externalReference` for provider identity (Google `eventId` /
`recurringEventId`) instead of separate `gEventId`/`gRecurringEventId` fields.

## Display Categories

`Categories_Event` (`packages/web/src/common/types/web.event.types.ts`) maps
events to visible buckets:

- `allday`
- `timed`

These are UI-facing categories, not storage categories.

For the full recurring-event lifecycle, see [Recurrence Handling](../Features/recurring-events-handling.md).

## Update Scopes

Recurring edits use `RecurringEventUpdateScope`:

- `This Event`
- `This and Following Events`
- `All Events`

If you change recurring edit behavior, check:

- `packages/core/src/types/event.contracts.ts`
- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation.ts`

## Backend Event Shape Semantics

The backend treats recurring events as:

- one series event (`recurrence.kind === "series"`) containing `rules`
- zero or more generated occurrences (`recurrence.kind === "occurrence"`) referencing the series via `seriesId`

When reading occurrences back, the backend rehydrates them against their series event's recurrence rules before returning them.

Primary code:

- `packages/backend/src/event/services/event.service.ts`
- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/compass.event.executor.ts`
- `packages/backend/src/event/classes/compass.event.generator.ts`

## Optimistic IDs

The web generates a real Mongo `ObjectId` client-side (`createObjectIdString()`) before the create mutation fires, so the optimistic event and the persisted event share the same `id`:

- web optimistic flow: `packages/web/src/events/mutations/useEventMutations.ts`
- backend normalization: `packages/backend/src/event/controllers/event.controller.ts`

Do not assume every incoming `id` is already a durable Mongo id.

## Tasks (removed)

The Tasks and Someday features were removed from the app in 2026-07 (v1.0.194).
`StoredTask` and the read-only legacy `tasks` IndexedDB table are retained in
`packages/web/src/common/storage/offline-data/offline-data.store.ts` for
one-time data recovery only (`getAllTasks`/`getTaskCount`/`clearAllTasks`) —
there is no live task-creation or task-editing path anywhere in the app. See
`packages/web/src/components/PlannerSidebar/TasksRemovalNotice` for the
user-facing removal notice.

## Invariants To Preserve

- Every persisted event must have a stable Compass `id`.
- Occurrences reference their series via `recurrence.seriesId`.
- Series events carry `recurrence.rules`.
- Local storage schemas can evolve, but migrations must preserve existing user data.

## Before Changing The Domain

Check all three layers:

1. `core` type/schema definition
2. `backend` persistence and sync behavior
3. `web` editing, rendering, selectors, storage, and tests

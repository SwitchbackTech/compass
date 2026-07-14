# Event And Task Domain Model

The event domain is the most cross-cutting part of Compass. Read this before changing event shape, recurrence logic, sync behavior, or local persistence.

## Current Contracts (sub-calendar v1)

The runtime now uses the strict calendar-owned contracts everywhere: Mongo
storage, the HTTP API, SSE, IndexedDB, and the web data/state layers. The
legacy sections further down describe the RETIRED pre-cutover model; they
remain only until the last web components stop converting shapes through
`packages/web/src/events/queries/event.legacy-bridge.ts`, after which the
legacy types are deleted.

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
Each line names the decision in `team/archive/google-subcalendar-project/master-doc.md`'s assumption
log that anchors the carve-out, so a future v2 effort starts from the
recorded reasoning instead of rediscovering it:

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

- `packages/core/src/types/event.types.ts`

Important event fields:

- `_id`: Compass event id
- `startDate`, `endDate`: ISO datetime or date strings
- `isAllDay`: display semantics
- `origin`: where the event came from
- `gEventId`: Google event id when synced
- `gRecurringEventId`: Google recurring parent id when relevant
- `recurrence.rule`: RRULE array for recurring bases
- `recurrence.eventId`: base Compass event id for recurring instances

## Display Categories

`Categories_Event` maps events to visible buckets:

- `allday`
- `timed`
- `sidebarWeek`
- `sidebarMonth`

These are UI-facing categories, not storage categories.

## Recurrence Categories

`Categories_Recurrence` models structural state:

- `STANDALONE`
- `RECURRENCE_BASE`
- `RECURRENCE_INSTANCE`

Many sync and parser decisions key off transitions between these states.

For the full recurring-event lifecycle, see [Recurrence Handling](../features/recurring-events-handling.md).

## Update Scopes

Recurring edits use `RecurringEventUpdateScope`:

- `This Event`
- `This and Following Events`
- `All Events`

If you change recurring edit behavior, check:

- `packages/core/src/types/event.types.ts`
- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation.ts`

## Backend Event Shape Semantics

The backend treats recurring events as:

- one base event containing recurrence rules
- zero or more generated instances referencing the base via `recurrence.eventId`

When reading instances back, the backend rehydrates the instance with the base event's recurrence rule before returning it.

Primary code:

- `packages/backend/src/event/services/event.service.ts`
- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/compass.event.executor.ts`
- `packages/backend/src/event/classes/compass.event.generator.ts`

## Optimistic IDs

The web generates a real Mongo `ObjectId` client-side (`createObjectIdString()`) before the create mutation fires, so the optimistic event and the persisted event share the same `_id`:

- web optimistic flow: `packages/web/src/events/mutations/useEventMutations.ts`
- backend normalization: `packages/backend/src/event/controllers/event.controller.ts`

Do not assume every incoming `_id` is already a durable Mongo id.

## Task Model

Primary source:

- `packages/web/src/common/types/task.types.ts`

Task fields:

- `_id`
- `title`
- `status` (`todo` or `completed`)
- `order`
- `createdAt`
- `description`
- `user`

Tasks are stored with a `dateKey` in the offline data store, not in the public
`Task` shape.

## Storage-Specific Task Shape

The IndexedDB offline data store wraps tasks as `StoredTask`:

- public task data
- plus `dateKey`

Source:

- `packages/web/src/common/storage/offline-data/offline-data.store.ts`

## Invariants To Preserve

- Every persisted event must have a stable Compass `_id`.
- Instances reference a base event via `recurrence.eventId`.
- Base recurring events carry the `recurrence.rule`.
- Tasks should normalize through `normalizeTask` / `normalizeTasks` before persistence.
- Local storage schemas can evolve, but migrations must preserve existing user data.

## Before Changing The Domain

Check all three layers:

1. `core` type/schema definition
2. `backend` persistence and sync behavior
3. `web` editing, rendering, selectors, storage, and tests

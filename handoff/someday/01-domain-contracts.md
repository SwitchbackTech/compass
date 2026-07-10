# 01 — Finalize calendar and event domain contracts

## Goal

Define one strict event language shared by core, backend, and web before any
migration or runtime work. Replace the current pattern where `Schema_Event`
acts as a database row, API payload, form draft, cache entity, and grid view at
the same time.

Depends on: `00-project-ledger.md` for historical requirements only. The
Project 6 issues are closed and are not execution dependencies.

## Why this is the design gate

`Schema_Event` makes almost every field optional, so invalid combinations are
normal: a timed event can omit dates, an all-day event can contain timestamps,
a recurrence can have both or neither `rule` and `eventId`, and a Google event
can omit its Google id. Callers compensate with conditional checks and casts.

The replacement uses three rules:

1. A persisted or returned event is complete. Optionality is allowed only in
   an intentionally incomplete form draft or in an external Google payload.
2. Mutually exclusive states are discriminated unions, not boolean flags and
   unrelated optional properties.
3. Storage, transport, form, and layout types have different names and explicit
   mappers. They may share nested contracts but never masquerade as each other.

## Naming rules

Use these suffixes consistently. Remove `Schema_`, `Core`, `Compass`, `Web`,
`Payload_`, and underscore-based variants as each old type is replaced.

| Name form | Meaning | Example |
| --- | --- | --- |
| `*Schema` | Runtime Zod validator | `EventSchema` |
| no suffix | Type inferred from that validator | `Event` |
| `*Record` | Persisted MongoDB or IndexedDB representation | `EventRecord` |
| `*Input` | Validated command/query accepted at an API boundary | `CreateEventInput` |
| `*Response` | Validated HTTP/SSE response envelope | `EventListResponse` |
| `*Draft` | Deliberately incomplete web editing state | `EventDraft` |
| `*View` / `*Layout` | Derived, non-persisted presentation state | `GridEventLayout` |
| `Google*` | Type that exists only at the Google adapter boundary | `GoogleEventReference` |

Every exported Zod schema has its type inferred from the schema. Do not write a
parallel interface that can drift from validation. Keep contracts in concrete
files; do not add barrel files.

## Shared primitive contracts

Create these once in `packages/core/src/types/` and reuse them everywhere:

| Contract | Required invariant |
| --- | --- |
| `EventIdSchema` / `EventId` | Branded 24-character Compass event id string at HTTP/web boundaries. |
| `CalendarIdSchema` / `CalendarId` | Branded 24-character Compass calendar id string; never a Google id. |
| `DateOnlySchema` / `DateOnly` | Strict `YYYY-MM-DD`; parsing must reject rollover dates. |
| `DateTimeSchema` / `DateTime` | RFC 3339 timestamp with an explicit offset. |
| `TimeZoneSchema` / `TimeZone` | Valid IANA time-zone identifier. |
| `SortOrderSchema` / `SortOrder` | Finite, non-negative integer. |
| `RRuleSchema` / `RRule` | Non-empty array of non-empty RFC 5545 recurrence lines. |

Use branded TypeScript types only to prevent accidental id/date mixing; JSON
remains strings and numbers.

## Calendar contracts

### Shared core contracts

1. `CalendarProviderSchema` / `CalendarProvider`
   - Active values are `"local"` and `"google"`.
   - Add `"outlook"` or `"ical"` only when that adapter exists. Do not add
     unimplemented union branches or a provider registry now.
2. `CalendarAccessSchema` / `CalendarAccess`
   - `"owner" | "writer" | "reader" | "freeBusyReader"`.
   - A local calendar maps to `owner`; consumers do not need a special branch.
3. `CalendarCapabilitiesSchema` / `CalendarCapabilities`
   - Required booleans: `canReadAvailability`, `canReadDetails`, `canWrite`,
     `canManage`, and `canWatchEvents`.
   - Computed by one pure mapper. Web code consumes capabilities instead of
     interpreting provider access roles repeatedly.
4. `CalendarSchema` / `Calendar`
   - Required: `id`, `name`, `description`, `timeZone`, foreground/background
     colors, `provider`, `access`, `capabilities`, `isPrimary`, `isVisible`, and
     `isActive`.
   - `description` is always a string; absent Google text maps to `""`.
   - `timeZone` is `TimeZone | null`, always present. `null` means the provider
     supplied no calendar time zone.
   - Provider ids, etags, user ids, and Mongo dates are not exposed.
5. `CalendarListResponseSchema` / `CalendarListResponse`
   - `{ calendars: Calendar[] }`; never return raw CalendarList entries.
6. `SetCalendarVisibilityInputSchema` / `SetCalendarVisibilityInput`
   - Exact object `{ calendarId, isVisible }` with unknown keys rejected.

### Backend persistence contracts

1. `LocalCalendarSourceRecordSchema`
   - `{ provider: "local" }`.
2. `GoogleCalendarSourceRecordSchema`
   - `{ provider: "google", calendarId, etag }` plus only provider fields needed
     for sync. Google response decoration does not belong in the record.
3. `CalendarSourceRecordSchema`
   - Discriminated union of the two source records.
4. `CalendarRecordSchema` / `CalendarRecord`
   - Required Mongo `_id`, `userId`, normalized name/description/time zone,
     colors, access, visibility/activity/primary flags, source, and timestamps.
   - Exactly one local calendar per user and at most one primary Google calendar
     per user are index invariants, not optional fields.

## Event contracts

### Content: represent privacy explicitly

`EventContentSchema` is a discriminated union for records returned by Google's
Events resource:

```ts
type EventContent =
  | { kind: "details"; title: string; description: string }
  | { kind: "busy" };
```

Empty title and description are valid, but both keys are required for
`details`. `busy` is used when a stable Google event exists but its private
details are withheld from a `reader`. The UI maps it to a localized “Busy”
label and never invents persisted title text.

Google access roles mean:

- `reader` can read calendar events but private event details may be hidden.
- `freeBusyReader` authorizes free/busy queries, which return occupied time
  ranges rather than stable event resources.
- both are read-only; `writer` and `owner` are writable.

Do not convert free/busy ranges into `Event`. They have no stable provider event
id, content, priority, or recurrence identity. Adapter tests must prove that a
reader's private event becomes `busy`, while free/busy data takes the separate
availability path below.

### Availability: do not manufacture events from free/busy ranges

`BusyPeriodSchema` / `BusyPeriod` is a separate shared read model:

```ts
type BusyPeriod = {
  calendarId: CalendarId;
  start: DateTime;
  end: DateTime;
};
```

Add strict `AvailabilityQuery` (`calendarIds`, `start`, `end`) and
`AvailabilityResponse` (`busyPeriods`) contracts. The backend resolves owned
`freeBusyReader` calendars, batches Google's `freeBusy.query` within Google's
calendar limit, and returns ranges for the visible window. It may use a short,
bounded cache keyed by user/calendar set/range; it does not persist fake events,
create event sync tokens, or start Events watches for these calendars. Calendar
list watching still tracks whether the calendar exists and its access role.

The web renders a discriminated `CalendarItem` union of canonical `Event` and
`BusyPeriod`. Busy periods are inspection-only and expose no edit, delete,
priority, or recurrence actions.

### Schedule: remove optional dates and boolean combinations

`EventScheduleSchema` is a discriminated union:

```ts
type EventSchedule =
  | {
      kind: "timed";
      start: DateTime;
      end: DateTime;
      timeZone: TimeZone;
    }
  | {
      kind: "allDay";
      start: DateOnly;
      end: DateOnly;
    }
  | {
      kind: "someday";
      period: "week" | "month";
      anchorDate: DateOnly;
      sortOrder: SortOrder;
    };
```

Invariants:

- Timed `end` is strictly after `start`. The required IANA time zone preserves
  recurrence behavior over daylight-saving changes; the offset preserves the
  exact instant.
- All-day `end` is exclusive, matching Google and iCalendar conventions, and
  is after `start`.
- Someday remains an event schedule, not a second entity. It participates in
  the same content, priority, recurrence, undo, and sync workflows.
- `isAllDay`, `isSomeday`, `startDate`, `endDate`, `order`, and `allDayOrder`
  do not exist in the final shared event.

Date storage follows the semantic value:

- Mongo stores timed `start`/`end` as BSON `Date` plus the required IANA time
  zone.
- Mongo stores all-day and someday dates as validated `YYYY-MM-DD` strings.
  BSON has no date-only type; converting these to midnight instants creates
  time-zone drift.
- HTTP and IndexedDB use the shared strings shown above. Pure mappers own every
  BSON/JSON conversion.

### Ordering recommendation

For v1, ordering belongs only on the someday schedule that users manually
order: `someday.sortOrder`. It is required there and impossible on timed or
all-day events. Current code has no production reader of legacy `allDayOrder`,
so the migration audits then retires it rather than making it a permanent
contract. Use integer positions and normalize the affected someday list in one
bulk operation after a reorder.

A separate ordering relation would better support multiple independent views,
per-user ordering of shared events, and collaborative ranking. It would also
add dangling references, concurrent reorder conflicts, another offline store,
and more migration/query work. Defer it until one of those requirements exists.
Fractional ranking strings are similarly unnecessary for v1.

### Recurrence: make every state valid by construction

`EventRecurrenceSchema` is a discriminated union and is always present:

```ts
type EventRecurrence =
  | { kind: "single" }
  | { kind: "series"; rules: RRule }
  | { kind: "occurrence"; seriesId: EventId };
```

An occurrence does not duplicate its series rules in storage. The backend
loads/expands the series when rules are required. Imported cancelled instances
remain sync input/tombstones and are not returned as ordinary events. Cross-
calendar `seriesId` references fail validation.

`RecurrenceScopeSchema` uses stable wire values `"this"`, `"thisAndFollowing"`,
and `"all"`; display labels stay in web translation code. Create accepts only
`single` and `series`; provider import is the only path that creates an
`occurrence` directly.

### Backend provider reference: one owner, at most one external identity

1. `GoogleEventReferenceSchema` / `GoogleEventReference`
   - `{ provider: "google", eventId, recurringEventId: string | null }`.
2. `ExternalEventReferenceSchema` / `ExternalEventReference`
   - Google is the only active union member. The event field is
     `ExternalEventReference | null`; local-only events use `null`.
   - Add Outlook/iCalendar members later without changing event ownership.
3. `EventOriginSchema` / `EventOrigin`
   - `"local" | "google"` now; extend only with implemented import adapters.
   - Origin and external reference are separate: a locally created event synced
     to Google keeps local origin and gains a Google reference.

Do not use a metadata array. A v1 event cannot reliably represent several
provider copies, and an array creates duplicate/conflicting identity states.

Provider identity is persisted for backend sync but not exposed in the web event
contract. Web cache cleanup and revoked-provider handling use calendar ids and
calendar provider state, not event origin or Google ids.

### Canonical shared event

`EventSchema` / `Event` is the complete API/read model:

```ts
type Event = {
  id: EventId;
  calendarId: CalendarId;
  content: EventContent;
  schedule: EventSchedule;
  recurrence: EventRecurrence;
  priority: Priority;
  createdAt: DateTime;
  updatedAt: DateTime | null;
};
```

Every key is required. The discriminated nested values are the only source of
shape variation. `userId`, provider origin, and provider references are not
part of the shared read event; ownership and provider cleanup are resolved
through its calendar.

### Backend event persistence

`EventRecordSchema` / `EventRecord` mirrors `Event` semantically but uses Mongo
ObjectIds/BSON Dates for `_id`, `calendarId`, timed instants, series references,
and timestamps. It adds required `origin` and nullable `externalReference` for
backend sync. It uses `schedule`, `content`, `recurrence`, and provider
discriminants rather than flattening them back into optional columns.

Required indexes:

- calendar plus schedule kind/range for visible range queries;
- calendar plus someday period/anchor/sort order;
- unique calendar plus external provider/event id, partial on external refs;
- recurrence series id;
- timestamps only where a concrete query needs them.

Do not index every field speculatively. Record an `explain` for each query that
justifies an index.

## HTTP command and response contracts

Put shared web/backend Zod contracts in core. Controllers parse them at ingress
and parse their own responses in contract tests.

| Contract | Shape and rule |
| --- | --- |
| `CreateEventInput` | Required `calendarId`, details content, schedule, recurrence (`single` or `series`), and priority. No id, user, timestamps, origin, occurrence, or provider identity. |
| `ReplaceEventInput` | Complete editable snapshot: details content, schedule, recurrence, and priority plus `scope`. Use `PUT`; no giant `Partial<Event>`. `calendarId` is absent because existing ownership is immutable. |
| `DeleteEventInput` | `{ scope }`; the event id remains the route parameter. |
| `ReorderEventsInput` | `{ period: "week" | "month", items: [{ eventId, sortOrder }] }`; reject duplicates, mixed owners, and non-someday events. |
| `EventListQuery` | Required mode discriminator: range query with start/end/calendar visibility filters, or someday query with period/anchor/cursor/limit. |
| `EventListResponse` | `{ events: Event[], nextCursor: string | null }`; no request fields mixed into the response. |
| `AvailabilityQuery` | Required calendar ids and bounded start/end instants; only availability-capable owned calendars are accepted. |
| `AvailabilityResponse` | `{ busyPeriods: BusyPeriod[] }`; periods are not assigned synthetic event ids. |
| `EventResponse` | `{ event: Event }` for create/replace/get. |
| `EventMutationError` | Stable codes for not found, read only, recurrence conflict, invalid schedule, and provider failure; reuse the repository's standard error envelope. |

Use narrow commands for reorder and delete because they have different
invariants. A complete replace command is preferable for ordinary edits: the
web already owns the full editable event, server validation is deterministic,
and omitted fields cannot accidentally mean both “unchanged” and “clear.” If a
future client genuinely needs patch semantics, add a JSON Merge Patch contract
then instead of making every field optional now.

## SSE contracts

Replace payload-less/`unknown` event data with shared strict envelopes:

1. `EventChangeMessageSchema` / `EventChangeMessage`
   - `{ type: "eventsChanged", calendarId, eventIds, reason }`.
   - `reason`: `"created" | "updated" | "deleted" | "reconciled"`.
   - Empty `eventIds` means invalidate the calendar, not all user data.
2. `CalendarChangeMessageSchema` / `CalendarChangeMessage`
   - `{ type: "calendarsChanged", calendarIds }`.
3. `SyncStatusMessageSchema` / `SyncStatusMessage`
   - preserve the current sync lifecycle, but validate it in the same shared
     event-message union.
4. `ServerMessageSchema` / `ServerMessage`
   - discriminated union parsed once by the web SSE client.

## Web-only types

These types belong under `packages/web/src/` and must not leak into core or the
backend:

1. `EventDraft`
   - The only intentionally incomplete event-like type.
   - Contains form fields and validation state, not `Partial<Event>` and not
     provider/timestamp fields. Separate `NewEventDraft` and `EditEventDraft`
     if id/calendar immutability otherwise requires checks.
2. `EventFormValues`
   - UI-native values such as `Date`, time select options, recurrence controls,
     and selected calendar. One parser produces `CreateEventInput` or
     `ReplaceEventInput`.
3. `EventEntityMap`
   - `Record<EventId, Event>` plus ordered ids; do not redefine the event.
4. `OptimisticEvent`
   - `{ event: Event, mutation: { id, state } }`; the event id is always present.
5. `GridEventLayout`
   - Required render-only position/overlap/drag fields. Compose
     `{ event: Event, layout: GridEventLayout }`; do not extend `EventSchema`
     with optional layout properties.
6. `CalendarItem`
   - Discriminated event/busy-period union used by range view models. Commands
     accept only its event branch.
7. `SelectedDateRange`
   - Required form selection state; map it to a schedule only at submission.
8. `SomedayColumnView`
   - Column ids and ordered `EventId[]`; event bodies remain in the shared
     entity map.
9. `LocalEventRecord`
   - IndexedDB record version plus canonical serialized event and local-only
     demo/sync state. Include an explicit schema version and migration; do not
     add marker fields to `Event`.

## Google adapter-only contracts

Google SDK response types are untrusted inputs and may omit fields. Keep their
optionality inside the adapter and map them immediately:

- `GoogleCalendarListEntryInput` -> `CalendarRecord`;
- `GoogleEventInput` -> `EventRecord` or a cancellation tombstone;
- `EventRecord` -> `GoogleEventWriteInput` for writable calendars;
- mapping result union: `mapped`, `cancelled`, `ignored`, or `invalid`, with a
  reason and structured logging that excludes user content.

Do not copy the full Google resource into Compass records. Outlook and iCalendar
adapters will later map into the same domain without changing web contracts.

## File placement

Recommended concrete files; adjust only if current ownership has changed:

```text
packages/core/src/types/calendar.contracts.ts
packages/core/src/types/event.contracts.ts
packages/core/src/types/event-command.contracts.ts
packages/core/src/types/server-message.contracts.ts
packages/backend/src/calendar/calendar.record.ts
packages/backend/src/event/event.record.ts
packages/backend/src/event/google-event-adapter.types.ts
packages/web/src/events/event-draft.types.ts
packages/web/src/events/event-view.types.ts
packages/web/src/common/storage/types/local-event.record.ts
```

Core contracts may be split when a file becomes hard to scan, but do not create
one file per tiny type or add barrel exports. Migration scripts should import
the backend record validator from a small shared persistence location if package
boundaries permit; otherwise move record schemas to a concrete core persistence
file used only by backend/scripts.

## Ordered implementation steps

1. Add primitive, calendar, event, command, and SSE schemas with exhaustive
   core tests. Use `.strict()` or the Zod v4 equivalent at external boundaries.
2. Add pure record/domain mappers and backend record validators. Validate
   cross-field ordering and recurrence invariants in one place.
3. Add Google mapping tests for missing text, private events, free/busy data,
   timed offsets/time zones, all-day exclusive ends, recurrence, cancellations,
   and malformed responses.
4. Add web draft/input and event/layout parsers. Prove incomplete drafts cannot
   enter cache, repository, or API functions.
5. Add shared command/response/SSE contract tests on both backend producers and
   web consumers.
6. Add calendar capability helpers and tests for all four Google access roles.
7. Document the final model in
   `docs/Architecture/event-and-task-domain-model.md`.
8. Freeze the contracts before writing the forward migration in plan `02`.
   Because the release is a planned breaking change, do not add legacy aliases,
   dual writes, optional calendar defaults, or old-client response fallbacks.

## Required test matrix

- Every content × schedule × recurrence combination that is valid, plus
  representative invalid combinations.
- Empty title/description, private reader events, non-event free/busy periods,
  and read-only capability enforcement.
- Positive and negative offsets, DST transitions, leap days, invalid dates,
  and all-day exclusive-end round trips without date drift.
- Standalone, series, occurrence, cross-calendar recurrence rejection, and
  every edit scope.
- Local and Google events, duplicate provider ids in different calendars,
  malformed external references, and future-provider unknown discriminants.
- New/edit draft conversion, optimistic state, cache normalization, IndexedDB
  migration, and grid layout without optional event fields.
- Strict request rejection for unknown/omitted fields and strict response/SSE
  parsing in web tests.
- Property-based round trips for `EventRecord -> Event -> EventRecord` where
  values are representable, plus migration fixtures for every legacy category.

## Exit criteria

- [ ] No final persisted or API event property is optional merely for caller
  convenience.
- [ ] Boolean schedule flags and ambiguous recurrence shapes are gone.
- [ ] Title and description are required strings for detail events; busy-only
  events are a separate explicit content case.
- [ ] Storage, HTTP, form, local persistence, cache, optimistic, SSE, and layout
  contracts have distinct names and tested mappers.
- [ ] Calendar capability and privacy behavior is derived once and shared.
- [ ] The contract catalog covers current core/backend/web event consumers and
  does not introduce an unused provider framework.
- [ ] `bun test:core`, affected backend/web contract tests, and
  `bun type-check` pass before plan `02` begins.

Suggested commit: `refactor(core): define strict event contracts`

# Recurrence Handling

This document explains how Compass models recurring events, how recurring edits are expanded, and how Compass and Google stay in sync after a recurrence change.

## Structural Model

Compass stores recurrence as a discriminated union on the event's `recurrence` field, with three kinds:

- `{ kind: "single" }` — a standalone, non-recurring event
- `{ kind: "series", rules }` — a series base, owning the RRULE (`rules`)
- `{ kind: "occurrence", seriesId }` — a materialized instance, pointing back at its series base by `seriesId`

The series base owns the recurrence rule; occurrences do not carry their own RRULE, only a `seriesId` reference. There is no separate "recurrence.eventId" pointer — the field is literally named `seriesId`.

Primary files:

- `packages/core/src/types/event.contracts.ts` (`EventRecurrenceSchema`)
- `packages/backend/src/event/event.record.ts` (`EventRecurrenceRecordSchema` — same three kinds, persisted shape)
- `packages/backend/src/event/services/recur/util/recur.util.ts` (RRULE expansion / `materializeSeriesInstances`)
- `packages/backend/src/event/services/event.service.ts`

Google linkage is a single `externalReference` field on the record (nullable), not separate `gEventId`/`gRecurringEventId` fields:

```
externalReference: { provider: "google", eventId, recurringEventId } | null
```

(`packages/backend/src/event/event.record.ts`)

## How Recurring Edits Are Planned

There is no longer a `Categories_Recurrence` classification (`STANDALONE`/`RECURRENCE_BASE`/`RECURRENCE_INSTANCE`) or a transition-key dispatch table — that mechanism was removed as part of the sub-calendar v1 rewrite. Recurrence handling is now a direct, three-stage pipeline keyed off the incoming mutation's `scope` (`"this" | "all" | "thisAndFollowing"`, `RecurrenceScopeSchema` in `packages/core/src/types/event-command.contracts.ts`) plus the target event's `recurrence.kind`:

1. **Analyze** — `analyzeReplace(...)` / `analyzeDelete(...)` in `compass.event.parser.ts` take the target `EventRecord`, its optional `SeriesContext` (`{ base, instances }`), the input, and `now`, and return a pure `ReplacePlan` or `DeletePlan` describing what must change.
2. **Materialize** — `generateReplace(...)` / `generateDelete(...)` in `compass.event.generator.ts` expand a plan into concrete records to persist (`MaterializedMutation`: `{ upsert, deleteIds, primary }`), including RRULE expansion via `materializeSeriesInstances` for a (re)created series.
3. **Execute** — `executeMutation(...)` / `executeDelete(...)` in `compass.event.executor.ts` persist the materialized change via `eventRepository` inside a Mongo transaction.

Primary files:

- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/compass.event.generator.ts`
- `packages/backend/src/event/classes/compass.event.executor.ts`
- `packages/backend/src/event/services/event.service.ts` (orchestrates analyze -> generate -> execute -> propagate -> notify)

## Update Scopes

Recurring edits arrive with a `scope` of `"this"`, `"all"`, or `"thisAndFollowing"` (`RecurrenceScopeSchema`). There is no `RecurringEventUpdateScope` enum or `CompassEventFactory` on the backend anymore — that expansion step lived in the old event model. The web layer still has its own `RecurringEventUpdateScope` enum (`packages/web/src/common/types/web.event.types.ts`, consumed by `packages/web/src/events/recurrence/recurrence-scope.ts`) for UI purposes, which maps down to the same three backend scope strings.

`analyzeReplace`/`analyzeDelete` resolve each scope directly:

- `"this"` on an occurrence updates/deletes just that instance; a series base itself cannot be edited/deleted with `"this"` (throws `RECURRENCE_CONFLICT`).
- `"all"` resolves to the series base (or the target itself if it's not part of a series) and rewrites/deletes the whole series.
- `"thisAndFollowing"` on the series' earliest occurrence collapses to `"all"`. Otherwise it splits the series: a truncated old base (RRULE `UNTIL` set just before the edited/deleted instance) plus, for replace, a new base starting at the edited instance.

Primary file:

- `packages/backend/src/event/classes/compass.event.parser.ts` (`analyzeReplace`, `analyzeDelete`)

## Plan And Mutation Shapes

`ReplacePlan` (`compass.event.parser.ts`) is one of:

- `replaceThis` — update a single stored event
- `replaceSeries` — replace the series base (and rematerialize instances if still a series)
- `replaceSplit` — truncate the old base, delete following instances, insert a new base (and its materialized instances)

`DeletePlan` is one of:

- `deleteThis` — delete a single stored event
- `deleteSeries` — delete an entire series by `seriesId`
- `deleteSplit` — truncate the base and delete the following instances

`generateReplace`/`generateDelete` (`compass.event.generator.ts`) turn each plan variant into a `MaterializedMutation` (`{ upsert, deleteIds, primary }`) or the delete equivalent (`{ upsert, deleteIds, deleteSeriesId, primary }`). `executeMutation`/`executeDelete` (`compass.event.executor.ts`) then persist that via `eventRepository.bulkReplace` / `deleteMany` / `deleteBySeriesId`.

There is no separate `UPDATE_SERIES` / `TRUNCATE_SERIES` / `RECREATE_SERIES` naming — the plan `kind` values above (`replaceSeries`, `replaceSplit`, etc.) are the current vocabulary.

## Google Sync Boundary

Google side effects are driven by an `EventChangeSet` (`{ upserted, deletedBefore, originalStartByEventId? }`) built in `event.service.ts` from the plan's materialized records plus the pre-mutation records being deleted/replaced. `CompassToGoogleEventPropagation.propagate(userId, change)` (in `compass-to-google.event-propagation.ts`) runs strictly after the Mongo transaction commits — Google writes never happen inside an open transaction.

There is no `analyzeCompassTransition`/`applyCompassPlan`/`CompassOperationPlan`/`clearRecurrenceBeforeGoogleUpdate`/`googleDeleteEventId` in the current code. Instead:

- `propagateDelete(...)` uses the record's own `externalReference.eventId` when present; for an occurrence with no `externalReference` yet, it resolves the series base via `resolveSeriesBase(...)` and looks up the Google instance by original start time (`gcalService.findEventInstance`).
- `propagateUpsert(...)` patches via `externalReference.eventId` when present, otherwise resolves/creates via the series base (for occurrences) or creates a new Google event (for a fresh base/single), then persists the resulting `externalReference` back onto the record.
- A series base present in the same upsert batch (a fresh series create, or a scope `"all"`/`"thisAndFollowing"` regeneration/truncation) is tracked in `regeneratingSeriesIds`; occurrences riding along in that same batch are skipped for per-instance Google resolution, since Google will expand/truncate its own copies from the base's RRULE.

Primary files:

- `packages/backend/src/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation.ts`
- `packages/backend/src/event/services/event.service.ts`

## Google Series Splits

Google "this and following" edits and deletes can split a series into multiple changes across incremental sync payloads.

Treat these as independent updates derived from event shape, not as one ordered bundle of related payloads.

Useful heuristics during Google sync:

- base event with a shortened `UNTIL` usually means the original series was truncated
- a new recurring base may represent the follow-on series
- cancelled instances should be handled as instance-level deletions
- payload ordering is not reliable enough to infer user intent by itself

This is why Compass-to-Google event propagation keys off persisted state plus event properties instead of trying to reconstruct a single high-level Google UI action.

## Recurrence Sync Triage Runbook

Use this sequence when recurring edits behave unexpectedly:

1. Reproduce the mutation via `eventService.replace`/`eventService.delete` (`packages/backend/src/event/services/event.service.ts`) and note the input `scope` and the target's `recurrence.kind`.
2. Step through `analyzeReplace`/`analyzeDelete` in `compass.event.parser.ts` to see which `ReplacePlan`/`DeletePlan` variant it produces (`replaceThis`/`replaceSeries`/`replaceSplit`, `deleteThis`/`deleteSeries`/`deleteSplit`).
3. Check the matching materialization in `compass.event.generator.ts` (`generateReplace`/`generateDelete`) for the resulting `upsert`/`deleteIds`/`primary`.
4. Verify persistence in `compass.event.executor.ts` (`executeMutation`/`executeDelete`) and Google propagation in `compass-to-google.event-propagation.ts` (`propagateUpsert`/`propagateDelete`).
5. Confirm against unit tests:
   - `compass.event.parser.test.ts`
   - `compass.event.generator.test.ts`
   - `compass.event.executor.test.ts`
   - `compass-to-google.event-propagation.test.ts`
6. For unexpected/missing Google updates on an occurrence, confirm `externalReference` is being read/written correctly and that `originalStartByEventId` carries the pre-edit anchor (needed because Google's `originalStartTime` never moves after an instance's own start/end is edited).

## What To Verify When Changing Recurrence Logic

- plan classification for single, series-base, and occurrence targets across all three scopes
- RRULE split behavior for:
  - no split (`"all"` / `"this"`)
  - `thisAndFollowing` truncation + new base
  - full series delete
- Google side effects for recurrence transitions, including the `regeneratingSeriesIds` skip path
- SSE notifications for calendar changes (`notify(...)` in `event.service.ts`)

Good test anchors:

- `packages/backend/src/event/classes/compass.event.parser.test.ts`
- `packages/backend/src/event/classes/compass.event.generator.test.ts`
- `packages/backend/src/event/classes/compass.event.executor.test.ts`
- `packages/backend/src/sync/services/event-propagation/__tests__/compass-to-google.all-event.test.ts`
- `packages/backend/src/sync/services/event-propagation/__tests__/compass-to-google.this-and-following-event.test.ts`
- `packages/backend/src/sync/services/event-propagation/__tests__/compass-to-google-this-event/*.test.ts`

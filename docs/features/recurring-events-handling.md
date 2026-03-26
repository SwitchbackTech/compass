# Recurrence Handling

This document explains how Compass models recurring events, how recurring edits are expanded, and how Compass and Google stay in sync after a recurrence change.

## Structural Model

Compass stores recurring events as:

- one base event with `recurrence.rule`
- zero or more generated instances with `recurrence.eventId`

The base event owns the recurrence rule. Instances do not carry their own independent rule in storage; they point back to the base. When the backend returns an instance through normal event reads, it rehydrates recurrence information from the base.

Primary files:

- `packages/core/src/types/event.types.ts`
- `packages/core/src/util/event/compass.event.rrule.ts`
- `packages/backend/src/event/services/event.service.ts`

## Recurrence Categories

Compass sync logic classifies event shape using `Categories_Recurrence`:

- `STANDALONE`
- `RECURRENCE_BASE`
- `RECURRENCE_INSTANCE`
- `STANDALONE_SOMEDAY`
- `RECURRENCE_BASE_SOMEDAY`
- `RECURRENCE_INSTANCE_SOMEDAY`

The Compass sync path treats recurrence handling as a transition problem:

1. build a transition context from the incoming Compass payload plus the current DB event
2. analyze that transition into a plain `CompassOperationPlan`
3. apply Compass persistence steps from the plan
4. execute Google side effects separately if the plan calls for them

Primary files:

- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/compass.event.executor.ts`
- `packages/backend/src/sync/services/sync/compass/compass.sync.processor.ts`

## Update Scopes

Recurring edits start with `RecurringEventUpdateScope`:

- `This Event`
- `This and Following Events`
- `All Events`

`CompassEventFactory` expands those user-facing scopes into one or more normalized `CompassEvent` payloads before sync processing runs.

Examples:

- `This Event` on a recurring instance becomes a single instance update/delete
- `This and Following Events` splits the existing series into:
  - a truncated old series
  - a new series starting at the edited instance
- `All Events` resolves to a base-series mutation

Primary file:

- `packages/backend/src/event/classes/compass.event.generator.ts`

## How Series Mutations Work

The recurrence planner distinguishes several Compass mutation shapes:

- `CREATE`: create a standalone event or a new series
- `UPDATE`: update one stored event
- `DELETE`: delete one stored event or one full series
- `UPDATE_SERIES`: update base/instance shared fields without rebuilding the series
- `TRUNCATE_SERIES`: delete instances after a new `UNTIL` date, then update the base series
- `RECREATE_SERIES`: delete generated instances, then recreate the series from the new rule

Current split rule:

- if only the RRULE `UNTIL` changed, use `TRUNCATE_SERIES`
- if other recurrence options changed, use `RECREATE_SERIES`
- if no recurrence split is needed, use `UPDATE_SERIES`

This keeps the recurrence interpretation in the planner and the DB mutations in the executor.

## Google Series Splits

Google "this and following" edits and deletes can split a series into multiple changes across incremental sync payloads.

Treat these as independent updates derived from event shape, not as one ordered bundle of related payloads.

Useful heuristics during Google sync:

- base event with a shortened `UNTIL` usually means the original series was truncated
- a new recurring base may represent the follow-on series
- cancelled instances should be handled as instance-level deletions
- payload ordering is not reliable enough to infer user intent by itself

This is why Compass sync logic keys off persisted state plus event properties instead of trying to reconstruct a single high-level Google UI action.

## Someday And Provider Semantics

`isSomeday` changes who is treated as the provider of record:

- normal events usually persist with Google provider data and may mirror to Google
- someday events persist as Compass-owned events and skip Google side effects

Transitions between someday and non-someday states are still analyzed as recurrence transitions. The plan decides whether Google should receive `create`, `update`, `delete`, or `none`.

## Google Sync Boundary

The recurrence planner does not call Google directly.

Instead:

- `analyzeCompassTransition(...)` describes the implied Google effect
- `applyCompassPlan(...)` performs only Compass DB mutations
- `CompassSyncProcessor` executes Google create/update/delete after Compass persistence succeeds

Delete-oriented Google effects should prefer the persisted DB `gEventId` when available, then fall back to the incoming payload `gEventId`.

## Transition Key And Plan Contract

The planner dispatch key is:

- `${dbCategory ?? "NIL"}->>${eventCategory}_${status}`

Concrete examples from current tests:

- `NIL->>RECURRENCE_BASE_CONFIRMED`
- `STANDALONE->>STANDALONE_CANCELLED`
- `RECURRENCE_BASE->>STANDALONE_CONFIRMED`

`analyzeCompassTransition(...)` returns a `CompassOperationPlan` with:

- transition metadata (`summary`, `operation`, `transitionKey`)
- Compass persistence intent (`compassMutation`, `steps`, `provider`)
- Google side-effect intent (`googleEffect`)
- optional `clearRecurrenceBeforeGoogleUpdate` guard for series -> standalone updates

`applyCompassPlan(...)` executes the `steps` in order, then returns:

- transition summary (`Event_Transition`)
- last persisted Compass event when a step returns one
- `googleDeleteEventId` resolved from persisted event first, otherwise planner fallback

The processor executes Google effects only after Compass persistence succeeds.

## Recurrence Sync Triage Runbook

Use this sequence when recurring edits behave unexpectedly:

1. Capture the transition key from backend logs:
   - `Handle Compass event(<id>): <transitionKey>`
2. Look up the key in `PLAN_BUILDERS` in `compass.event.parser.ts`.
3. Verify the planned `steps` order and `googleEffect` in unit tests:
   - `compass.event.parser.test.ts`
   - `compass.event.executor.test.ts`
   - `compass.sync.processor.test.ts`
4. Map each step to persistence calls in `executeStep(...)`:
   - `create` -> `_createCompassEvent`
   - `update` -> `_updateCompassEvent`
   - `update_series` -> `_updateCompassSeries`
   - `delete_single` -> `_deleteSingleCompassEvent`
   - `delete_series` -> `_deleteSeries`
   - `delete_instances_after_until` -> `_deleteInstancesAfterUntil`
5. For unexpected Google deletes, confirm `googleDeleteEventId` came from persisted DB `gEventId` before payload fallback.
6. For series -> standalone updates, verify the recurrence-clearing guard:
   - planner sets `clearRecurrenceBeforeGoogleUpdate`
   - executor clears `persistedEvent.recurrence` before `_updateGcal(...)`

## What To Verify When Changing Recurrence Logic

- transition classification for base, instance, standalone, and someday shapes
- `RecurringEventUpdateScope` expansion in `CompassEventFactory`
- RRULE split behavior for:
  - no split
  - `UNTIL`-only truncation
  - full series recreation
- Google side effects for someday/non-someday transitions
- websocket notifications for calendar vs someday changes

Good test anchors:

- `packages/backend/src/event/classes/compass.event.parser.test.ts`
- `packages/backend/src/event/classes/compass.event.executor.test.ts`
- `packages/backend/src/sync/services/sync/__tests__/compass.sync.processor.all-event.test.ts`
- `packages/backend/src/sync/services/sync/__tests__/compass-sync-processor-this-event/*.test.ts`

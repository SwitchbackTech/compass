# Event And Task Domain Model

The event domain is the most cross-cutting part of Compass. Read this before changing event shape, recurrence logic, sync behavior, or local persistence.

## Core Event Schema

Primary source:

- `packages/core/src/types/event.types.ts`

Important event fields:

- `_id`: Compass event id
- `startDate`, `endDate`: ISO datetime or date strings
- `isAllDay`: display semantics
- `isSomeday`: local Compass someday bucket semantics
- `origin`: where the event came from
- `priority`: shared priority enum
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
- `STANDALONE_SOMEDAY`
- `RECURRENCE_BASE_SOMEDAY`
- `RECURRENCE_INSTANCE_SOMEDAY`

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
- `packages/backend/src/sync/services/sync/compass/compass.sync.processor.ts`

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

## Someday Semantics

`isSomeday` is not just a UI flag.

It affects:

- query behavior
- sync transitions
- websocket notification type
- provider selection when mapping events

For someday events, Compass often behaves as the provider of record instead of Google.

## Optimistic IDs

The web can create optimistic ids using a prefix, and the backend strips that prefix before persisting:

- web optimistic flow: `packages/web/src/ducks/events/sagas/event.sagas.ts`
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

Tasks are currently local-storage centric and are stored with a `dateKey` in the adapter layer, not in the public `Task` shape.

## Storage-Specific Task Shape

The IndexedDB adapter wraps tasks as `StoredTask`:

- public task data
- plus `dateKey`

Source:

- `packages/web/src/common/storage/adapter/storage.adapter.ts`

## Invariants To Preserve

- Every persisted event must have a stable Compass `_id`.
- Instances reference a base event via `recurrence.eventId`.
- Base recurring events carry the `recurrence.rule`.
- `isSomeday` changes downstream sync and notification behavior.
- Tasks should normalize through `normalizeTask` / `normalizeTasks` before persistence.
- Local storage schemas can evolve, but migrations must preserve existing user data.

## Before Changing The Domain

Check all three layers:

1. `core` type/schema definition
2. `backend` persistence and sync behavior
3. `web` editing, rendering, selectors, storage, and tests

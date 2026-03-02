# Offline Storage And Migrations

Compass supports a meaningful local-first path for unauthenticated users and resilient fallback behavior for authenticated users.

## Storage Entry Points

Primary files:

- `packages/web/src/common/storage/adapter/adapter.ts`
- `packages/web/src/common/storage/adapter/storage.adapter.ts`
- `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`

The adapter layer exists so application code is not tightly bound to Dexie.

## Adapter Lifecycle

`initializeStorage()` does this:

1. lazily create the storage adapter singleton
2. open the underlying IndexedDB database
3. run adapter-level schema upgrades
4. run app-level data migrations
5. run app-level external import migrations

The initialization call is idempotent and memoized by `initPromise`.

## IndexedDB Schema

Current database name:

- `compass-local`

Current table groups:

- `events`
- `tasks`
- `_migrations`

The IndexedDB adapter keeps:

- events keyed by `_id`
- tasks keyed by `_id` and associated to a `dateKey`
- migration completion records in `_migrations`

## Legacy Primary-Key Migration

File:

- `packages/web/src/common/storage/adapter/legacy-primary-key.migration.ts`

There is explicit support for an older task schema that used `id` instead of `_id`.

Recovery strategy:

1. detect the Dexie upgrade error
2. read legacy records through a legacy Dexie schema
3. delete the old database
4. reopen using the current schema
5. reinsert events and tasks

## Data Migrations

File:

- `packages/web/src/common/storage/migrations/migrations.ts`

Data migrations:

- transform data already inside Compass storage
- are tracked in the `_migrations` table
- fail startup if they fail

Current example:

- task `id` -> `_id` migration

## External Migrations

External migrations:

- import data from outside the adapter
- are tracked in localStorage, not IndexedDB
- are non-blocking on failure

Current examples:

- localStorage task import
- demo data seeding

## Failure Model

Database initialization errors are surfaced to the user but do not hard-stop app boot.

Files:

- `packages/web/src/common/utils/app-init.util.ts`
- `packages/web/src/index.tsx`

Expected behavior:

- app still renders
- toast explains offline storage is unavailable
- authenticated users can continue in remote-only mode

## Event And Task Persistence

Event operations:

- query overlapping date ranges
- put one or many events
- delete by event id

Task operations:

- get tasks for a `dateKey`
- replace all tasks for a date
- upsert a single task
- move a task between dates

All task writes should pass through normalization helpers from `packages/web/src/common/types/task.types.ts`.

## When To Add A Migration

Add a migration when you change:

- IndexedDB schema shape
- local task/event field names or required defaults
- import behavior from legacy local sources

Choose the right mechanism:

- adapter schema/version change for storage structure
- data migration for data already in storage
- external migration for imports from localStorage or other sources

## Safe Editing Checklist

Before changing storage behavior:

1. update adapter code
2. add or adjust migration if existing user data could break
3. add tests for fresh database and migrated database paths
4. confirm startup still degrades gracefully when storage fails

# Offline Storage And Migrations

Compass supports a meaningful local-first path for unauthenticated users and resilient fallback behavior for authenticated users.

## Storage Boundaries

Compass uses two intentionally separate storage abstractions:

- `OfflineDataStore` owns asynchronous event and migration-record data (plus a
  retained, read-only legacy `tasks` table — see below). Its current
  implementation is `IndexedDbOfflineDataStore`.
- `BrowserKeyValueStore` owns synchronous browser key-value state backed by
  `localStorage` or `sessionStorage`.

Primary files:

- `packages/web/src/common/storage/offline-data/offline-data.store.registry.ts`
- `packages/web/src/common/storage/offline-data/offline-data.store.ts`
- `packages/web/src/common/storage/offline-data/indexeddb-offline-data.store.ts`
- `packages/web/src/common/storage/browser-key-value.store.ts`

Components and hooks must use feature-level storage utilities. Native
`localStorage`, `sessionStorage`, and IndexedDB access belong only in these
storage implementations, migrations, or black-box test setup.

## Offline Data Store Lifecycle

`initializeOfflineDataStore()` does this:

1. lazily create the offline data store singleton
2. open the underlying IndexedDB database
3. run store-level schema upgrades
4. run app-level data migrations
5. run app-level external import migrations

The initialization call is idempotent and memoized by `initPromise`.

For tests that instantiate `IndexedDbOfflineDataStore` directly, call
`store.close()` during teardown before deleting the test database. This closes
the Dexie connection and resets readiness state for the next test.

## IndexedDB Schema

Current database name:

- `compass-local`

Current table groups:

- `events`
- `tasks` — retained read-only for recovery; the Tasks feature was removed
  (2026-07) and there is no live task-creation or task-editing path anymore
- `_migrations`

The IndexedDB store keeps:

- events keyed by `_id`
- tasks keyed by `_id` and associated to a `dateKey` (legacy rows only, see
  `StoredTask` in `offline-data.store.ts`)
- migration completion records in `_migrations`

## Legacy Primary-Key Migration

File:

- `packages/web/src/common/storage/offline-data/legacy-primary-key.migration.ts`

There is explicit support for an older task schema that used `id` instead of `_id`. This exists purely so the retained legacy `tasks` rows (see Tasks below) survive a Dexie schema upgrade without data loss.

Recovery strategy:

1. detect the Dexie upgrade error
2. read legacy records through a legacy Dexie schema
3. delete the old database
4. reopen using the current schema
5. reinsert events and legacy tasks

## Data Migrations

File:

- `packages/web/src/common/storage/migrations/migrations.ts`

Data migrations:

- transform data already inside Compass storage
- are tracked in the `_migrations` table
- fail startup if they fail

There are currently no registered data migrations (`dataMigrations` is empty); the array exists as the extension point for the next one.

## External Migrations

External migrations:

- import data from outside the offline data store
- are tracked in localStorage, not IndexedDB
- are non-blocking on failure

Current example:

- demo data seeding (`packages/web/src/common/storage/migrations/external/demo-data-seed.ts`)

## Failure Model

Database initialization errors are surfaced to the user but do not hard-stop app boot.

Files:

- `packages/web/src/common/utils/app-init.util.ts`
- `packages/web/src/index.tsx`

Expected behavior:

- app still renders
- toast explains offline storage is unavailable
- authenticated users can continue in remote-only mode

## Event Persistence

Event operations:

- query overlapping date ranges
- put one or many events
- delete by event id

## Legacy Task Recovery

The only remaining task-shaped operations are read-only, for recovering data a user had before the feature was removed:

- `getAllTasks()` — read every retained legacy task row
- `getTaskCount()` — cheap existence check without reading every row
- `clearAllTasks()` — clear the retained legacy table

There is no create/update/reorder/move path for tasks anymore.

## When To Add A Migration

Add a migration when you change:

- IndexedDB schema shape
- local event field names or required defaults
- import behavior from legacy local sources

Choose the right mechanism:

- offline data store schema/version change for storage structure
- data migration for data already in storage
- external migration for imports from localStorage or other sources

## Safe Editing Checklist

Before changing storage behavior:

1. update the relevant storage abstraction
2. add or adjust migration if existing user data could break
3. add tests for fresh database and migrated database paths
4. confirm startup still degrades gracefully when storage fails

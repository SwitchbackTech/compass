# Migrations

Umzug discovers every `*.{ts,js}` file in this directory (excluding `*.test.ts`),
orders them lexicographically by filename (so the `YYYY.MM.DD...` prefix is
chronological), and records applied migrations in the `migrations` collection.
See `../commands/migrate.ts`.

## Test / coverage policy

The migration **implementations** are all retained: a fresh provisioning path
and any supported upgrade path still runs the chain, and some steps also
require a manual operator rename between them (see the event-collection cutover
runbook), so the chain is intentionally not a single self-contained "run all up
on an empty DB".

Migration **tests** follow a baseline policy:

- **Permanently-completed migrations** (the 2025-era schema/data steps that have
  run on every live database since the calendar-owned-events cutover) do **not**
  keep heavy per-migration integration suites. Their intermediate schemas are
  superseded by later steps, so re-running them against a seeded database tests
  states that no supported deployment is in anymore. Those six suites were
  removed. `migration-discovery.test.ts` cheaply guards the discovery/ordering
  contract for the whole chain, and the pure data-transform logic keeps its fast
  unit tests in `../common/migration-support/`.
- **Recent migrations** (within their rollback/support window) keep a focused
  integration suite proving reads, writes, indexes, idempotency, and failure
  behavior -- but push exhaustive input/edge-case coverage down to the pure
  transform unit tests rather than repeating every case through the database.

Do not reintroduce a full integration suite per historical migration. If you add
a new migration, add a suite in that second shape.

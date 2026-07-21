# Migrations

Umzug discovers every `*.{ts,js}` file in this directory (excluding `*.test.ts`),
orders them lexicographically by filename (so the `YYYY.MM.DD...` prefix is
chronological), and records applied migrations in the `migrations` collection.
See `../commands/migrate.ts`.

## Retention policy

Migrations are removed once no supported upgrade path runs them. The
sub-calendar v1 cutover migrations (legacy event/calendar transforms and the
event-record backfill) shipped in releases up to v1.0.310 and were deleted
afterwards; pre-cutover installs must upgrade through v1.0.310 first (see
`docs/self-hosting/upgrades.md`). Umzug tolerates ledger entries for deleted
files -- they simply never rerun.

## Test / coverage policy

- `migration-discovery.test.ts` cheaply guards the discovery/ordering
  contract for the whole chain.
- **Migrations within their rollback/support window** keep a focused
  integration suite proving reads, writes, indexes, idempotency, and failure
  behavior -- but push exhaustive input/edge-case coverage down to pure
  transform unit tests rather than repeating every case through the database.

Do not reintroduce a full integration suite per historical migration. If you add
a new migration, add a suite in that second shape.

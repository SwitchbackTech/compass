# CLI

Compass has a CLI to help devs run a few scripts locally.

```bash
bun run cli --help
```

Primary file:

- `packages/scripts/src/cli.ts`

## Commands To Know

| Command | Implementation | Notes |
| --- | --- | --- |
| `bun run cli migrate <umzug-subcommand>` | `packages/scripts/src/commands/migrate.ts` | Runs wrapped Umzug subcommands: `pending`, `executed`, `up`, `down`, and `create`. Inspect `bun run cli migrate --help` before bounded execution. |
| `bun run cli migrate pending` | `packages/scripts/src/commands/migrate.ts` | Lists pending migrations. |
| `bun run cli migrate executed` | `packages/scripts/src/commands/migrate.ts` | Lists executed migrations. |
| `bun run cli inventory-legacy-sync [--out path.json]` | `packages/scripts/src/commands/inventory-legacy-sync.ts` | Read-only S46 inventory of legacy Google sync data (users/credentials/calendars/events/cursors/watches). Never writes or calls providers. |
| `bun run cli migrate-connections [--apply] [--out report.json] [--user-id id]...` | `packages/scripts/src/commands/migrate-connections.ts` | S47: idempotently upsert Sync connections + credentials from legacy users. Default dry-run; `--apply` writes. Never clears source tokens or enqueues Sync jobs. |
| `bun run cli migrate-provider-state [--apply] [--out report.json] [--user-id id]...` | `packages/scripts/src/commands/migrate-provider-state.ts` | S48: idempotently upsert Sync calendars, linked events, occurrences, and sync cursors from legacy data. Default dry-run; `--apply` writes. Requires S47 connections. Defers unlinked events to S49; skips legacy watches for Sync rewatch. |
| `bun run cli migrate-pending-intent [--apply] [--out report.json] [--user-id id]... [--target-calendar-id id] [--target-gcal-id id]` | `packages/scripts/src/commands/migrate-pending-intent.ts` | S49: preserve unlinked Compass events in Sync and submit resumable backfill create commands. Default dry-run; `--apply` writes. Never infers target by email; never mirrors already-linked events. |
| `bun run cli preseed-sync [--apply] [--out dir] [--mode live\|frozen] [--phase inventory\|connections\|state\|pending\|all] [--user-id id]...` | `packages/scripts/src/commands/preseed-sync.ts` | S51: compose S46–S49 into a resumable Sync pre-seed with blocking parity + immutable execution record under `--out`. Exit 1 when parity blockers remain. Never enables workers/callbacks or deletes source. |

## Sync Database Backup / Restore

These scripts are **not** registered on `bun run cli`. They dump/restore only
the isolated Sync Mongo database (`sync.mongoUri` / `SYNC_MONGO_URI`), never
the Compass API database. Requires MongoDB Database Tools on `PATH`.

```bash
bun packages/scripts/src/commands/sync-backup.ts [--out DIR]
bun packages/scripts/src/commands/sync-restore.ts --from DIR [--drop]
```

Use `--drop` only against a throwaway Sync database during a restore drill.

## Migration Internals

The migration command:

- starts Mongo
- builds an Umzug CLI dynamically
- loads migrations from `packages/scripts/src/migrations`
- stores execution state in Mongo collections

There is also a separate web-local migration system under `packages/web/src/common/storage/migrations`; do not confuse the two.

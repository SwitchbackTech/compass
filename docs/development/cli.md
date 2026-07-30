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
| `bun run cli purge-user` | `packages/scripts/src/commands/purge-user.ts` | Delete every Compass row for one email, across the API db, Sync db, and SuperTokens (`--apply` to write). |
| `bun run cli purge-corrupt-sync-events` | `packages/scripts/src/commands/purge-corrupt-sync-events.ts` | Delete Sync events that fail `EventRecordSchema` (poison from an aborted migrate). |
| `bun run cli refresh-connection-states` | `packages/scripts/src/commands/refresh-connection-states.ts` | Re-derive every provider connection's stored state from live evidence (`--apply` to write). |

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

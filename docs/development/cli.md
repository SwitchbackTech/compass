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
| `bun run cli purge-user --email <address> [--apply] [--out report.json]` | `packages/scripts/src/commands/purge-user.ts` | Deletes one user's API, Sync, and SuperTokens data. Defaults to dry-run. |
| `bun run cli purge-corrupt-sync-events [--apply]` | `packages/scripts/src/commands/purge-corrupt-sync-events.ts` | Deletes invalid Sync event documents. Defaults to dry-run. |
| `bun run cli refresh-connection-states [--apply]` | `packages/scripts/src/commands/refresh-connection-states.ts` | Re-derives Sync connection state. Defaults to dry-run. |

## Sync Database Backup / Restore

These scripts are **not** registered on `bun run cli`. They dump/restore only
the isolated Sync Mongo database (`sync.mongoUri` / `SYNC_MONGO_URI`), never
the Compass API database. Requires MongoDB Database Tools on `PATH`.

```bash
bun packages/scripts/src/commands/sync-backup.ts [--out DIR]
bun packages/scripts/src/commands/sync-restore.ts --from DIR [--drop]
```

Use `--drop` only against a throwaway Sync database during a restore drill.

## Historical Migrations

The server-side migration runner and completed Sync cutover tools were removed.
Current releases do not ship pending database migrations. An installation that
still needs the sub-calendar v1 cutover must use the documented historical
`v1.0.310` stepping-stone release. Browser-local migrations remain under
`packages/web/src/common/storage/migrations`.

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
| `bun run cli delete --user <id-or-email> --force` | `packages/scripts/src/commands/delete.ts` | Full user purge logic for Compass Mongo data, SuperTokens auth identities, user-id mappings, and SuperTokens metadata. Browser cleanup for cookies, localStorage, and IndexedDB is separate. |
| `bun run cli migrate <umzug-subcommand>` | `packages/scripts/src/commands/migrate.ts` | Runs wrapped Umzug subcommands: `pending`, `executed`, `up`, `down`, and `create`. Inspect `bun run cli migrate --help` before bounded execution. |
| `bun run cli migrate pending` | `packages/scripts/src/commands/migrate.ts` | Lists pending migrations. |
| `bun run cli migrate executed` | `packages/scripts/src/commands/migrate.ts` | Lists executed migrations. |
| `bun run cli seed <umzug-subcommand>` | `packages/scripts/src/commands/migrate.ts` | Runs seeders with the same migration framework and Mongo-backed execution state. |

## Migration Internals

The migration command:

- starts Mongo
- builds an Umzug CLI dynamically
- loads migrations from `packages/scripts/src/migrations` or seeders from `packages/scripts/src/seeders`
- stores execution state in Mongo collections

There is also a separate web-local migration system under `packages/web/src/common/storage/migrations`; do not confuse the two.

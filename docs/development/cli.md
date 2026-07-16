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

## Deleting An Account

There is no longer a `cli delete` command. Users delete their own account from
the app: open the command palette and run **Delete account** (Settings), which
calls `DELETE /api/user`. That purges their Compass data and SuperTokens auth
state, revokes their Google grant, and clears their browser storage.

## Migration Internals

The migration command:

- starts Mongo
- builds an Umzug CLI dynamically
- loads migrations from `packages/scripts/src/migrations`
- stores execution state in Mongo collections

There is also a separate web-local migration system under `packages/web/src/common/storage/migrations`; do not confuse the two.

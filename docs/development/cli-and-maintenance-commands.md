# CLI And Maintenance Commands

Compass ships a repo CLI for builds and database maintenance.

## Entry Point

Primary file:

- `packages/scripts/src/cli.ts`

Root command:

```bash
yarn cli <command>
```

Environment loading:

- `yarn cli` runs Node with `--env-file=packages/backend/.env.local`.
- Keep local development variables in `packages/backend/.env.local` (bootstrap from `.env.local.example`).

## CLI URL Resolution Contract

Primary source:

- `packages/scripts/src/common/cli.utils.ts`

How API base URLs are resolved:

- local (`--environment local`): returns `BASEURL` directly (trailing slash removed)
- staging (`--environment staging`): uses host from `STAGING_WEB_URL` and builds `https://<host>/api`
- production (`--environment production`): uses host from `PROD_WEB_URL` and builds `https://<host>/api`

Fallback behavior:

- if `STAGING_WEB_URL`/`PROD_WEB_URL` are missing, CLI prompts for a domain and builds `https://<domain>/api`
- local mode does not prompt for a domain; it depends on `BASEURL`

## Supported Commands

### Build

Examples:

```bash
yarn cli build web --environment staging --clientId "test-client-id"
yarn cli build nodePckgs --environment staging
```

Implementation:

- `packages/scripts/src/commands/build.ts`

Use for:

- production-style web builds
- compiled node package output

### Delete

Example:

```bash
yarn cli delete --user <id-or-email> --force
```

Implementation:

- `packages/scripts/src/commands/delete.ts`

Use with care; this is user-data deletion logic.

### Migrate

Example shape:

```bash
yarn cli migrate <umzug-subcommand>
```

Implementation:

- `packages/scripts/src/commands/migrate.ts`

This command wraps Umzug and uses Mongo-backed migration storage.

Verified subcommands (`yarn cli migrate --help`):

- `up` - apply pending migrations
- `down` - revert migrations
- `pending` - list pending migrations
- `executed` - list already applied migrations
- `create` - scaffold a new migration file

Common examples:

```bash
# inspect migration state
yarn cli migrate pending
yarn cli migrate executed

# apply everything pending
yarn cli migrate up

# apply a specific migration only
yarn cli migrate up --name 2025.10.13T14.22.21.migrate-sync-watch-data

# revert the most recent migration
yarn cli migrate down
```

`up` and `down` also support `--to` and `--step` for bounded execution.

### Seed

Example shape:

```bash
yarn cli seed <umzug-subcommand>
```

Use for database seeder flows built on the same migration framework.

## Migration Internals

The migration command:

- starts Mongo
- builds an Umzug CLI dynamically
- loads migrations from `packages/scripts/src/migrations` or seeders from `packages/scripts/src/seeders`
- stores execution state in Mongo collections

There is also a separate web-local migration system under `packages/web/src/common/storage/migrations`; do not confuse the two.

## Runbook: Sync Watch Data Migration

Source migration:

- `packages/scripts/src/migrations/2025.10.13T14.22.21.migrate-sync-watch-data.ts`

Intent:

- move Google watch-channel management to the dedicated `watch` collection
- recreate active Google watches from sync-derived event watch entries
- leave sync token data in `sync` records

What the migration does in `up`:

1. clears existing `watch` collection entries
2. scans `sync` records with Google event watch metadata and valid expirations
3. creates a Google client per user (`getGcalClient`)
4. stops old watch channels referenced in sync data
5. creates fresh event watches (per calendar) and one calendar-list watch
6. inserts rebuilt watch records via `WatchSchema`

Operational constraints:

- this migration performs live Google watch API calls; valid Google credentials are required per user
- execution can consume API quota on large datasets because channels are stopped and recreated
- `down` is intentionally non-destructive and does not rebuild old sync-embedded watch state

Recommended execution pattern:

```bash
# verify target migration is pending
yarn cli migrate pending

# run only the watch migration
yarn cli migrate up --name 2025.10.13T14.22.21.migrate-sync-watch-data

# confirm it is now recorded as executed
yarn cli migrate executed
```

## Safety Guidance

- Prefer reading a command implementation before running it.
- Treat delete flows as destructive unless proven otherwise.
- For migration work, inspect existing migration naming and ordering first.
- For build work, confirm whether you need `web` or `nodePckgs`.

## Quick Reference

- General help: `yarn cli --help`
- Build package outputs: `yarn cli build ...`
- Database migration framework: `yarn cli migrate ...`
- Seeder framework: `yarn cli seed ...`
- User-data maintenance: `yarn cli delete ...`

There is no waitlist invite CLI command in the current codebase. Mobile waitlist signup is handled in the web app via `packages/web/src/components/MobileGate/MobileGate.tsx`.

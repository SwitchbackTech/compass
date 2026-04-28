# CLI And Maintenance Commands

Compass ships a repo CLI for database maintenance and a few legacy build paths.
Prefer this doc for safety context; use `bun run cli --help` for exhaustive
command syntax.

## Entry Point

```bash
bun run cli <command>
```

Primary file:

- `packages/scripts/src/cli.ts`

Environment loading:

- `bun run cli` loads `packages/backend/.env.local`.
- Keep local development variables in `packages/backend/.env.local` (bootstrap from `.env.local.example`).

## CLI URL Resolution Contract

Primary source:

- `packages/scripts/src/common/cli.utils.ts`

How API base URLs are resolved:

- local (`--environment local`): returns `BASEURL` directly (trailing slash removed)
- staging/production: derives `https://<domain>/api` from `FRONTEND_URL`

Fallback behavior:

- if `FRONTEND_URL` points at `localhost`, CLI prompts for a domain and builds `https://<domain>/api`
- if `FRONTEND_URL` is already a non-localhost URL, CLI uses that hostname directly
- local mode does not prompt for a domain; it depends on `BASEURL`

## Commands To Know

### Delete

Implementation:

- `packages/scripts/src/commands/delete.ts`

Example:

```bash
bun run cli delete --user <id-or-email> --force
```

Use with care; this is full user purge logic. It removes Compass Mongo data,
SuperTokens auth identities, user-id mappings, and SuperTokens metadata.
Browser cleanup is still a separate local-only step for cookies, localStorage,
and IndexedDB.

### Migrate

```bash
bun run cli migrate <umzug-subcommand>
```

Implementation:

- `packages/scripts/src/commands/migrate.ts`

Use `pending`, `executed`, `up`, `down`, and `create` through the wrapped Umzug
CLI. For bounded execution, inspect `bun run cli migrate --help` before running.

Common inspection commands:

```bash
bun run cli migrate pending
bun run cli migrate executed
```

### Seed

```bash
bun run cli seed <umzug-subcommand>
```

Seeders use the same migration framework and Mongo-backed execution state.

### Build

Builds usually use direct package scripts:

- `bun run build:web`
- `bun run build:backend --environment [local|staging|production]`

Use CLI build commands only when you specifically need their legacy packaging
behavior.

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
bun run cli migrate pending
bun run cli migrate up --name 2025.10.13T14.22.21.migrate-sync-watch-data
bun run cli migrate executed
```

## Safety Guidance

- Prefer reading a command implementation before running it.
- Treat delete flows as destructive unless proven otherwise.
- For migration work, inspect existing migration naming and ordering first.
- For build work, use `bun run build:web` or `bun run build:backend` directly (not the CLI).
- There is no waitlist invite CLI command in the current codebase.

Mobile waitlist signup is handled in the web app via
`packages/web/src/components/MobileGate/MobileGate.tsx`.

# CLI And Maintenance Commands

Compass ships a repo CLI for builds and database maintenance.

## Entry Point

Primary file:

- `packages/scripts/src/cli.ts`

Root command:

```bash
yarn cli <command>
```

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

Implementation:

- `packages/scripts/src/commands/invite.ts`

### Migrate

Example shape:

```bash
yarn cli migrate <umzug-subcommand>
```

Implementation:

- `packages/scripts/src/commands/migrate.ts`

This command wraps Umzug and uses Mongo-backed migration storage.

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
- Waitlist/user maintenance: `yarn cli invite`, `yarn cli delete ...`

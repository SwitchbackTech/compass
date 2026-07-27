# Sync Service Cutover And Operations

How the standalone Sync service (`packages/sync`) takes over Google connection
and event paths from the legacy in-backend sync, and how operators pause,
pre-seed, diagnose, and recover safely.

For the browser-facing Google/SSE flows, see
[Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md). For CLI
migration commands, see [CLI](../development/cli.md).

## Intent

Legacy Google sync lives inside `packages/backend`. The Sync service owns an
isolated Mongo database and authenticated internal HTTP routes. The backend
stays the browser API and SSE boundary, and **delegates** selected paths when
cutover knobs say so.

Cutover is global (not per-user). Misconfiguration fails closed:

- routing switches require `sync.serviceUrl` + `sync.internalAuthToken`
- resolvers still fall back to `legacy` if the Sync client is missing at runtime
- backend startup refuses an unsafe dual-writer window (active Sync + enabled
  cloud mutations while any routing remains `legacy`)

## Cutover Knobs

Configured under `sync:` in `compass.yaml` (see [Configuration](../Config/README.md)).
`GET /api/config` exposes the current posture under `sync.*` plus
`google.connectDelegatedToSync`.

| Knob | Values | Default | Owns |
| --- | --- | --- | --- |
| `connectionRouting` | `legacy` \| `sync` | `legacy` | Browser-facing provider connection (connect/status) |
| `eventRouting` | `legacy` \| `sync` | `legacy` | Calendar/event reads and durable write commands |
| `cloudMutationMode` | `enabled` \| `maintenance` | `enabled` | Whether cloud edits / connect are accepted |
| `execution` | `passive` \| `active` | `passive` | Sync-side OAuth begin, provider import, job claims |

Source of truth for validation:

- `packages/core/src/config/compass.config.ts`
- `packages/backend/src/common/constants/config.constants.ts`
- Resolvers: `connection-routing.ts`, `event-routing.ts`, `cloud-mutation-mode.ts`

### Independence

Connection and event routing are independent so the riskier event path can
roll out separately. `cloudMutationMode` and `execution` are orthogonal to
routing: you can pause mutations while Sync stays passive or active.

### Maintenance response

When `cloudMutationMode=maintenance`, mutating controllers call
`assertCloudMutationsAllowed()` and reject with a typed `MAINTENANCE`
`EventMutationException` (`503`). Controllers should check this before any
write work; propagation services also refuse as defense-in-depth.

## Safe Cutover Sequence

Do not flip both routing switches to `sync` and set `execution=active` with
mutations enabled while legacy still owns any path — startup will refuse that
combination.

Recommended operator sequence:

1. **Provision Sync** with its own `mongoUri`, `internalAuthToken`,
   `callbackBaseUrl`, and (when the API should call it) `serviceUrl`.
   Keep `execution: passive` and routing `legacy`.
2. **Pre-seed Sync data** from the API database with CLI (dry-run first):
   ```bash
   bun run cli preseed-sync --out ./tmp/preseed-report
   bun run cli preseed-sync --apply --out ./tmp/preseed-report
   ```
   Preseed never enables workers/callbacks, never deletes source data, and
   never calls Google. Exit `1` if parity blockers remain.
3. **Enter maintenance** (`cloudMutationMode: maintenance`) so users cannot
   mutate cloud state during the dual-writer window.
4. **Flip routing** to `sync` for connections, then events (or both once
   verified). Confirm `GET /api/config` shows the intended posture.
5. **Activate Sync** (`execution: active`) only after both routings are
   `sync` (or keep mutations in maintenance until they are).
6. **Leave maintenance** (`cloudMutationMode: enabled`) when Sync owns the
   paths and health looks clean.

Rollback: set the relevant routing knob back to `legacy` (and/or
`execution: passive`). Prefer maintenance while rolling back under load.

## What Delegates Where

When routing is `sync` and a Sync client is configured, the backend uses
`SyncServiceClient` (`packages/backend/src/common/services/sync-service/`):

| Browser / API concern | Internal Sync path | Client method |
| --- | --- | --- |
| Begin Google connect | `POST /internal/connections/begin` | `beginConnection` |
| Connection status | `GET /internal/connections` | connection helpers |
| Calendar list | `GET /internal/calendars` | calendar list translation |
| Event reads | `GET /internal/events` / `.../full` | `listEventOccurrences` / `listFullEvents` |
| Event writes | `POST /internal/commands` | `submitCommand` (30s deadline) |
| Account deletion | `DELETE /internal/principal` | `purgePrincipal` |
| Support lookup | `GET /internal/diagnostics/connections/:key` | diagnostic helper |
| Browser invalidation | `GET /internal/changes` | change feed → SSE bridge |

Public Sync surfaces (via reverse proxy `/sync/*`, not the API):

- OAuth callback: `/sync/google`
- Google push: `/sync/notifications/google`

## Preseed And Migration CLI

| Stage | Command | Role |
| --- | --- | --- |
| S46 | `inventory-legacy-sync` | Read-only inventory of legacy Google sync data |
| S47 | `migrate-connections` | Upsert Sync connections + credentials |
| S48 | `migrate-provider-state` | Upsert calendars, linked events, occurrences, cursors |
| S49 | `migrate-pending-intent` | Preserve unlinked Compass events + backfill creates |
| S51 | `preseed-sync` | Compose S46–S49 with blocking parity + execution record |

All migrate/preseed commands default to dry-run; pass `--apply` to write.
See [CLI](../development/cli.md) for flags.

## Operating And Recovery

### Health

Sync emits sanitized aggregate health snapshots (no user ids) for telemetry.
Local readiness/liveness live on the Sync HTTP app (`packages/sync/src/server/health.routes.ts`).
Backend `GET /api/health` still only proves the API + its Mongo are up.

### Diagnostics

Support lookup uses a 32-hex `diagnosticKey` derived from the connection id
(`deriveDiagnosticKey` in `packages/sync/src/safety/diagnostic-key.ts`). Call
`GET /internal/diagnostics/connections/:diagnosticKey` with the Sync internal
auth token. Response is redacted for support use.

### Backup / restore (Sync DB only)

```bash
bun packages/scripts/src/commands/sync-backup.ts [--out DIR]
bun packages/scripts/src/commands/sync-restore.ts --from DIR [--drop]
```

Requires MongoDB Database Tools and `SYNC_MONGO_URI` or `sync.mongoUri`.
These scripts never dump the Compass API database. Use `--drop` only on a
throwaway Sync database during a drill.

### Retention And Account Deletion

- Soft-disconnected Sync connections keep cached provider content for **30
  days**, then a retention sweep purges the connection cache
  (`CONNECTION_CACHE_RETENTION_MS`).
- Compass **Delete account** calls Sync `purgePrincipal`, which hard-deletes
  Sync-held rows for that principal immediately (overrides the 30-day window).

## Common Pitfalls

- Setting only `internalAuthToken` without `serviceUrl` does **not** enable
  backend delegation (by design).
- `execution=active` + `cloudMutationMode=enabled` + any `legacy` routing
  fails startup (dual-writer guard).
- `submitCommand` uses a **30s** timeout because provider deletes run inline;
  the default 5s client timeout is too short and can report failure while Sync
  still applied the delete.
- Legacy watch maintenance and Sync rewatch are different owners — preseed
  skips migrating legacy watches so Sync can establish its own subscriptions.
- Passive Sync still runs local retention/health; it does not claim provider
  jobs or begin OAuth.

## Related Files

- Backend client/factory: `packages/backend/src/common/services/sync-service/`
- Sync HTTP registration: `packages/sync/src/server/sync.server.ts`
- Config exposure: `packages/backend/src/config/controllers/config.controller.ts`
- Example knobs: `compass.example.yaml` (`sync:` block)

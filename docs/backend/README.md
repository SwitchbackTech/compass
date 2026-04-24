# Compass Backend

Backend service for auth/session management, event persistence, Google sync, and SSE notifications.

## Intent

The current production integration is Google Calendar, but backend code should move toward provider-agnostic boundaries over time.

When changing sync or auth logic:

- avoid hard-coding provider assumptions in shared request paths
- keep Google-specific behavior inside sync/auth service layers
- preserve Compass-local event behavior when Google credentials are missing

## Source Anchors

- Entry points:
  - `packages/backend/src/app.ts`
  - `packages/backend/src/servers/express/express.server.ts`
- Route registration:
  - `packages/backend/src/**/*routes.config.ts`
- Shared error handling:
  - `packages/backend/src/common/errors/handlers/error.express.handler.ts`
- Realtime notifications:
  - `packages/backend/src/servers/sse/sse.server.ts`

## Primary Backend Workflows

### Auth and Session

- SuperTokens recipes are initialized in:
  - `packages/backend/src/common/middleware/supertokens.middleware.ts`
- Recipe overrides in:
  - `packages/backend/src/common/middleware/supertokens.middleware.handlers.ts`

Important runtime behavior:

- password sign-up/sign-in upserts Compass users (`userService.upsertUserFromAuth`)
- sign-out delegates cleanup to `userService.handleLogoutCleanup(...)`
  - if the user has Google connection data, metadata marks incremental sync as `RESTART`
  - if this is the last active session, backend stops Google watches for that user
  - sign-out response still returns even if cleanup logging reports an error

### Event Writes and Sync

- Event writes route through the Compass sync processor and can apply Google side effects.
- Missing Google refresh token does not block Compass-local event writes; Google side effects are skipped.

Key files:

- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/sync/services/sync/compass/compass.sync.processor.ts`
- `packages/backend/src/sync/services/outbound/sync.compass-to-google.ts`

### Google Notification Ingress

- endpoint: `POST /api/sync/gcal/notifications`
- source: `packages/backend/src/sync/controllers/sync.controller.ts`
- handler: `packages/backend/src/sync/services/notify/sync.notification.service.ts`

Observed outcomes include:

- `INITIALIZED` for Google channel handshake notifications
- `IGNORED` for stale/missing watch/sync records
- `204` for missing-sync-token recovery paths
- `410` revoked/missing-token responses when Google data is pruned

## Operational Notes

- Watch shutdown and cleanup are intentionally idempotent:
  - stale/missing Google channels are deleted locally and processing continues
  - missing refresh token paths also delete stale watch records instead of hard-failing maintenance
- `/api/sync/import-gcal` accepts an optional body contract:
  - `{ "force": true }` to force restart when not currently importing
  - omitted or false follows normal metadata guardrails

Sync implementation is split by responsibility:

- imports and repair restarts: `packages/backend/src/sync/services/import/sync.import-runner.ts`
- Google watch start/stop/refresh: `packages/backend/src/sync/services/watch/sync.watch.service.ts`
- incoming Google notifications: `packages/backend/src/sync/services/notify/sync.notification.service.ts`
- watch maintenance: `packages/backend/src/sync/services/maintain`
- Compass-to-Google backfill after repair: `packages/backend/src/sync/services/outbound/sync.compass-to-google.ts`

## Related Docs

- [Backend Request Flow](./backend-request-flow.md)
- [Compass API Documentation](./api-documentation.md)
- [Backend Error Handling](./backend-error-handling.md)
- [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md)

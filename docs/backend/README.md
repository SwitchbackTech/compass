# Backend

Backend service for auth/session management, event persistence, Google sync,
and SSE notifications.

## Intent

The current production integration is Google Calendar, but backend code should
move toward provider-agnostic boundaries over time.

When changing sync or auth logic:

- avoid hard-coding provider assumptions in shared request paths
- keep Google-specific behavior inside sync/auth service layers
- preserve Compass-local event behavior when Google credentials are missing

## Route Map

Backend routes are registered from
`packages/backend/src/servers/express/express.server.ts`.

| Area | Source | Notes |
| --- | --- | --- |
| Health | `packages/backend/src/health/health.routes.config.ts` | `GET /api/health` is unauthenticated and checks Mongo reachability. |
| Config | `packages/backend/src/config/config.routes.config.ts` | Public runtime config used by the web app. |
| Auth | `packages/backend/src/auth/auth.routes.config.ts` | Compass-owned auth helpers and authenticated Google connect. SuperTokens also mounts recipe routes under `/api`. |
| User | `packages/backend/src/user/user.routes.config.ts` | Profile and metadata for the active session. |
| Priority | `packages/backend/src/priority/priority.routes.config.ts` | Priority CRUD for authenticated users. |
| Events | `packages/backend/src/event/event.routes.config.ts` | Event CRUD and reorder/delete helpers. |
| Event stream | `packages/backend/src/events/events.routes.config.ts` | Authenticated SSE stream at `GET /api/events/stream`. |
| Sync | `packages/backend/src/sync/sync.routes.config.ts` | Google import, maintenance, debug, and notification routes. |
| Calendars | `packages/backend/src/calendar/calendar.routes.config.ts` | Calendar list and selection routes. |

Use source files as the exhaustive route list. This page keeps the behavior
that is easiest to misunderstand.

## Auth And Session Boundaries

SuperTokens recipes are initialized in
`packages/backend/src/common/middleware/supertokens.middleware.ts`.

Important runtime behavior:

- password sign-up/sign-in upserts Compass users (`userService.upsertUserFromAuth`)
- sign-out delegates cleanup to `userService.handleLogoutCleanup(...)`
- sign-out response still returns even if cleanup logging reports an error
- `GET /api/health` is intentionally unauthenticated
- most user data routes require `verifySession()`

## Event Writes

- Event writes route through Compass-to-Google event propagation and can apply Google side effects.
- Missing Google refresh token does not block Compass-local event writes; Google side effects are skipped.
- Controllers use the shared `res.promise(...)` response helper and centralized
  error handling.

Key files:

- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation.ts`
- `packages/backend/src/sync/services/event-propagation/compass-to-google/compass-to-google-backfill.ts`

## Google Notification Ingress

- endpoint: `POST /api/sync/gcal/notifications`
- source: `packages/backend/src/sync/controllers/sync.controller.ts`
- middleware: `publicWatchNotificationIngress.verify`
- ingress owner: `packages/backend/src/sync/services/public-watch-notifications/public-watch-notification.ingress.ts`
- notification owner: `packages/backend/src/sync/services/watch/google-watch.service.ts`
- repair/setup owner: `packages/backend/src/sync/services/google-sync/google-sync.service.ts`
- import owner: `packages/backend/src/sync/services/import/google-import.service.ts`
- maintenance owner: `packages/backend/src/sync/services/watch/google-watch-maintenance.service.ts`

Observed outcomes include:

- `INITIALIZED` for Google channel handshake notifications
- `IGNORED` for stale/missing watch/sync records
- `204` for missing-sync-token recovery paths
- `410` revoked/missing-token responses when Google data is pruned

## SSE Stream

The web app opens `GET /api/events/stream` with the active SuperTokens session
cookie. The backend subscribes that response to per-user fan-out and immediately
pushes `USER_METADATA`.

Primary files:

- `packages/backend/src/events/controllers/events.controller.ts`
- `packages/backend/src/servers/sse/sse.server.ts`
- `packages/core/src/constants/sse.constants.ts`

## Operational Contracts

- Watch shutdown and cleanup are intentionally idempotent:
  - stale/missing Google channels are deleted locally and processing continues
  - missing refresh token paths also delete stale watch records instead of hard-failing maintenance
- `/api/sync/import-gcal` accepts an optional body contract:
  - `{ "force": true }` to force restart when not currently importing
  - omitted or false follows normal metadata guardrails

## Related Docs

- [Backend Request Flow](./backend-request-flow.md)
- [Backend Error Handling](./backend-error-handling.md)
- [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md)

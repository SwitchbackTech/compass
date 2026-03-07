# Compass API Documentation

## Table of Contents

- [Calendar Routes](#calendar-routes)
- [Auth Routes](#auth-routes)
- [User Routes](#user-routes)
- [Common Routes](#common-routes)
- [Priority Routes](#priority-routes)
- [Sync Routes](#sync-routes)
- [Event Routes](#event-routes)

---

## Calendar Routes

**Source**: `packages/backend/src/calendar/calendar.routes.config.ts`

### /api/calendars

### /api/calendars/select

---

## Auth Routes

**Source**: `packages/backend/src/auth/auth.routes.config.ts`

### /api/auth/session

Development helper endpoint (guarded by `verifyIsDev`):

- `POST /api/auth/session` creates a session for a provided Compass user id
- `GET /api/auth/session` returns the current session user id

---

## User Routes

**Source**: `packages/backend/src/user/user.routes.config.ts`

### /api/user/profile

### /api/user/metadata

`/api/user/metadata` notes:

- `GET` returns user metadata enriched with Google connection status.
- `POST` merges partial metadata updates.

Current metadata shape used by sync/auth flows:

```ts
{
  sync?: {
    importGCal?: "importing" | "errored" | "completed" | "restart" | null;
    incrementalGCalSync?: "importing" | "errored" | "completed" | "restart" | null;
  };
  google?: {
    hasRefreshToken?: boolean;
  };
}
```

---

## Common Routes

**Source**: `packages/backend/src/common/common.routes.config.ts`

_Review the source file for route definitions_

---

## Priority Routes

**Source**: `packages/backend/src/priority/priority.routes.config.ts`

### /api/priority

### /api/priority/:id

---

## Sync Routes

**Source**: `packages/backend/src/sync/sync.routes.config.ts`

### /api${GCAL_NOTIFICATION_ENDPOINT}

Google push-notification ingress endpoint (Google-only caller).

Observed outcomes:

- `200` with `"INITIALIZED"` on channel handshake notifications
- `200` with `"IGNORED"` for stale/missing watch or sync records
- `204` when sync-token recovery is triggered or intentionally skipped
- `410` with `GOOGLE_REVOKED` payload when Google credentials are missing/revoked and user data is pruned

### /api/sync/maintain-all

### /api/sync/import-gcal

Authenticated user trigger for full import restart:

- middleware: `verifySession()` + `requireGoogleConnectionSession`
- response: `204 No Content`
- import runs asynchronously; progress is surfaced via websocket `IMPORT_GCAL_START` / `IMPORT_GCAL_END`

### /api/event-change-demo

### ${SYNC_DEBUG}/import-incremental/:userId

### ${SYNC_DEBUG}/maintain/:userId

### ${SYNC_DEBUG}/refresh/:userId

### ${SYNC_DEBUG}/start

### ${SYNC_DEBUG}/stop

### ${SYNC_DEBUG}/stop-all/:userId

---

## Event Routes

**Source**: `packages/backend/src/event/event.routes.config.ts`

### /api/event

### /api/event/deleteMany

### /api/event/reorder

### /api/event/delete-all/:userId

### /api/event/:id

Write semantics:

- `POST /api/event`, `PUT /api/event/:id`, `DELETE /api/event/:id` require Google connection middleware
- controllers use `res.promise(...)` and return status-only payloads for `204 No Content` responses
- errors are routed through centralized Express error handling (Google/API-specific handling included)

---

## Authentication

Most endpoints require authentication via Supertokens session management.

**Authentication Flow**:

1. Client initiates OAuth flow via `/api/auth`
2. User authenticates with Google
3. Session cookie is set
4. Subsequent requests include session cookie
5. Backend validates session with `verifySession()` middleware

## Common Patterns

### Route Configuration

Routes are defined in `*routes.config.ts` files using Express router:

```typescript
this.app
  .route(`/api/endpoint`)
  .all(verifySession()) // Authentication middleware
  .get(controller.method)
  .post(controller.create)
  .put(controller.update)
  .delete(controller.delete);
```

### Middleware

- `verifySession()` - Requires valid Supertokens session
- `requireGoogleConnectionSession` - Requires Google OAuth connection
- `verifyIsDev` - Development environment only

## Error Responses

Standard error response format:

```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": "Additional context (optional)"
}
```

Google revocation is a first-class error contract used by API and websocket flows:

```json
{
  "code": "GOOGLE_REVOKED",
  "message": "Google access revoked. Your Google data has been removed."
}
```

When this payload accompanies `401` or `410`, web clients should keep the session, switch to local event behavior, and prompt reconnect instead of forcing sign-out.

## Key Endpoints

- `/api/auth/*` - Authentication and OAuth flows
- `/api/user/*` - User profile and metadata
- `/api/event/*` - Calendar event CRUD operations
- `/api/calendars/*` - Calendar list and selection
- `/api/sync/*` - Google Calendar synchronization
- `/api/priority/*` - Task priority management

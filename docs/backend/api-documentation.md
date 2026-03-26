# Compass API Documentation

## Table of Contents

- [Health Routes](#health-routes)
- [Calendar Routes](#calendar-routes)
- [Auth Routes](#auth-routes)
- [User Routes](#user-routes)
- [Common Routes](#common-routes)
- [Priority Routes](#priority-routes)
- [Sync Routes](#sync-routes)
- [Event Routes](#event-routes)
- [Operational Headers](#operational-headers)

---

## Health Routes

**Source**: `packages/backend/src/health/health.routes.config.ts`, `packages/backend/src/health/controllers/health.controller.ts`

### /api/health

`GET /api/health` verifies MongoDB connectivity and returns a minimal status payload.

Behavior:

- no authentication middleware is applied
- returns `200` when `mongoService.db.admin().ping()` succeeds
- returns `500` when the database ping fails
- always includes an ISO-8601 `timestamp`

Success response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T12:34:56.789Z"
}
```

Failure response:

```json
{
  "status": "error",
  "timestamp": "2026-03-07T12:34:56.789Z"
}
```

---

## Calendar Routes

**Source**: `packages/backend/src/calendar/calendar.routes.config.ts`

### /api/calendars

Authenticated calendar list endpoints:

- `GET /api/calendars`
  - middleware: `verifySession()`
  - returns all calendar records available to the authenticated user
- `POST /api/calendars`
  - middleware: `verifySession()`
  - creates a calendar record for the authenticated user

### /api/calendars/select

- `PUT /api/calendars/select`
  - middleware: `verifySession()`
  - toggles selected calendars used for sync/display

---

## Auth Routes

**Source**: `packages/backend/src/auth/auth.routes.config.ts`

### /api/auth/session

Compass-defined development helper endpoint (guarded by `verifyIsDev`):

- `POST /api/auth/session` creates a session for a provided Compass user id
- `GET /api/auth/session` returns the current session user id

`POST /api/auth/session` request example:

```json
{
  "cUserId": "67c9c6d49e2f3f65e0f44a1a"
}
```

Behavior constraints:

- route is intended for development workflows only
- `cUserId` must be a valid Mongo ObjectId string
- `GET` also requires `verifySession()`

### SuperTokens-managed auth endpoints (runtime)

Files:

- `packages/backend/src/common/middleware/supertokens.middleware.ts`
- `packages/web/src/auth/session/SessionProvider.tsx`
- `packages/web/src/common/apis/auth.api.ts`
- `packages/web/src/components/AuthModal/hooks/useAuthFormHandlers.ts`

The web app uses SuperTokens APIs mounted under `/api`:

- `POST /api/signinup` (Google OAuth sign-in/up exchange used by `AuthApi.loginOrSignup`)
- `POST /api/signout` (session sign-out)
- `POST /api/session/refresh` (session refresh)
- Email/password flows are also recipe-managed by SuperTokens and called through `supertokens-web-js`:
  - `EmailPassword.signUp(...)`
  - `EmailPassword.signIn(...)`
  - `EmailPassword.sendPasswordResetEmail(...)`
  - `EmailPassword.submitNewPassword(...)`

These endpoints are framework-managed by the SuperTokens recipes configured in `initSupertokens()`, not by `auth.routes.config.ts`.

Runtime constraints from recipe overrides:

- successful password `signUpPOST` and `signInPOST` upsert the Compass user via `userService.upsertUserFromAuth(...)`
- password `createNewRecipeUser` ensures SuperTokens external user-id mapping exists and points to a Mongo `ObjectId` string
- password-reset emails are currently logged (dev/test) or logged as disabled (non-dev), not delivered by an external provider

---

## User Routes

**Source**: `packages/backend/src/user/user.routes.config.ts`

### /api/user/profile

- `GET /api/user/profile`
  - middleware: `verifySession()`
  - returns current user profile for the active session user

### /api/user/metadata

`/api/user/metadata` notes:

- `GET` returns user metadata enriched with server-computed Google connection state.
- `POST` merges partial metadata updates.

Current metadata shape used by sync/auth flows:

```ts
{
  sync?: {
    importGCal?: "IMPORTING" | "ERRORED" | "COMPLETED" | "RESTART" | null;
    incrementalGCalSync?: "IMPORTING" | "ERRORED" | "COMPLETED" | "RESTART" | null;
  };
  google?: {
    connectionState?:
      | "NOT_CONNECTED"
      | "RECONNECT_REQUIRED"
      | "IMPORTING"
      | "HEALTHY"
      | "ATTENTION";
  };
}
```

Behavior constraints:

- `google.connectionState` is server-enriched and should be treated as a read-only client contract.
- `google.connectionState` values are uppercase literals:
  - `NOT_CONNECTED`: no linked Google account
  - `RECONNECT_REQUIRED`: linked account without refresh token
  - `IMPORTING`: import or repair is in progress
  - `HEALTHY`: linked account and sync health checks passed
  - `ATTENTION`: linked account but sync needs repair

---

## Common Routes

**Source**: `packages/backend/src/common/common.routes.config.ts`

`CommonRoutesConfig` is an abstract base class for route modules.

- no public API endpoints are defined in this module
- endpoint paths live in feature route config files (`*.routes.config.ts`)

---

## Priority Routes

**Source**: `packages/backend/src/priority/priority.routes.config.ts`

### /api/priority

- `GET /api/priority`
  - middleware: `verifySession()`
  - returns all priority entities for current user
- `POST /api/priority`
  - middleware: `verifySession()`
  - creates a priority entity

### /api/priority/:id

- `GET /api/priority/:id`
- `PUT /api/priority/:id`
- `DELETE /api/priority/:id`

Shared middleware for `:id` routes:

- `verifySession()`
- `validateIdParam` (ensures `:id` is a valid ObjectId)

---

## Sync Routes

**Source**: `packages/backend/src/sync/sync.routes.config.ts`

### /api${GCAL_NOTIFICATION_ENDPOINT}

Google push-notification ingress endpoint (Google-only caller).

Resolved path from `GCAL_NOTIFICATION_ENDPOINT`:

- `POST /api/sync/gcal/notifications`
- middleware: `authMiddleware.verifyIsFromGoogle`

Observed outcomes:

- `200` with `"INITIALIZED"` on channel handshake notifications
- `200` with `"IGNORED"` for stale/missing watch or sync records
- `204` when sync-token recovery is triggered or intentionally skipped
- `410` with `GOOGLE_REVOKED` payload when Google credentials are missing/revoked and user data is pruned

### /api/sync/maintain-all

- `POST /api/sync/maintain-all`
- middleware: `authMiddleware.verifyIsFromCompass`
- intended caller: trusted internal job/function with `x-comp-token`
- controller uses a 5-minute timeout guard and may return `504` on timeout while work continues

### /api/sync/import-gcal

Authenticated user trigger for full import restart:

- middleware: `verifySession()` + `requireGoogleConnectionSession`
- response: `204 No Content`
- import runs asynchronously; progress is surfaced via websocket `IMPORT_GCAL_START` / `IMPORT_GCAL_END`

### /api/event-change-demo

- `POST /api/event-change-demo`
- debug helper route used to dispatch event-change notifications to a configured demo socket user

### ${SYNC_DEBUG}/import-incremental/:userId

- `POST /api/sync/debug/import-incremental/:userId`
- middleware: `verifyIsFromCompass` + `requireGoogleConnectionFrom("userId")`

### ${SYNC_DEBUG}/maintain/:userId

- `POST /api/sync/debug/maintain/:userId?dry=true|false`
- middleware: `verifyIsFromCompass` + `requireGoogleConnectionFrom("userId")`
- `dry` query controls dry-run mode

### ${SYNC_DEBUG}/refresh/:userId

- `POST /api/sync/debug/refresh/:userId`
- middleware: `verifyIsFromCompass` + `requireGoogleConnectionFrom("userId")`

### ${SYNC_DEBUG}/start

- `POST /api/sync/debug/start`
- middleware: `verifyIsFromCompass` + `verifySession()` + `requireGoogleConnectionSession`

### ${SYNC_DEBUG}/stop

- `POST /api/sync/debug/stop`
- middleware: `verifyIsFromCompass` + `verifySession()` + `requireGoogleConnectionSession`

### ${SYNC_DEBUG}/stop-all/:userId

- `POST /api/sync/debug/stop-all/:userId`
- middleware: `verifyIsFromCompass` + `requireGoogleConnectionFrom("userId")`

---

## Event Routes

**Source**: `packages/backend/src/event/event.routes.config.ts`

### /api/event

- `GET /api/event`
  - middleware: `verifySession()`
- `POST /api/event`
  - middleware: `verifySession()`

### /api/event/deleteMany

- `DELETE /api/event/deleteMany`
  - middleware: `verifySession()`

### /api/event/reorder

- `PUT /api/event/reorder`
  - middleware: `verifySession()`

### /api/event/delete-all/:userId

- `DELETE /api/event/delete-all/:userId`
  - middleware: `verifySession()` + `authMiddleware.verifyIsDev`

### /api/event/:id

- `GET /api/event/:id`
  - middleware: `verifySession()`
- `PUT /api/event/:id`
  - middleware: `verifySession()`
- `DELETE /api/event/:id`
  - middleware: `verifySession()`

Write semantics:

- event writes (`POST`, `PUT`, `DELETE`) require only `verifySession()` at the route layer
- `CompassSyncProcessor` applies Compass mutations first, then attempts Google side effects
- if Google side effects fail only because refresh token is missing, Compass writes are preserved and Google effects are skipped
- controllers use `res.promise(...)` and return status-only payloads for `204 No Content` responses
- errors are routed through centralized Express error handling (Google/API-specific handling included)

---

## Authentication

Most endpoints require authentication via Supertokens session management.

**Authentication Flow**:

1. Client completes SuperTokens auth via either:
   - Google OAuth (`POST /api/signinup`)
   - email/password recipe flows (`signUp`, `signIn`, password reset actions via SDK)
2. Session cookie is set
3. Subsequent requests include session cookie
4. Backend validates session with `verifySession()` middleware

Authentication exceptions:

- `GET /api/health` is intentionally unauthenticated for monitoring and load balancer probes

## Operational Headers

Source files:

- `packages/backend/src/auth/middleware/auth.middleware.ts`
- `packages/backend/src/sync/sync.routes.config.ts`
- `packages/backend/src/sync/util/sync.util.ts`

Important non-cookie auth headers:

- `x-comp-token`
  - required for Compass-internal sync routes guarded by `verifyIsFromCompass`
  - must match `ENV.TOKEN_COMPASS_SYNC`
- Google notification headers (`x-goog-*`)
  - required for notification ingress guarded by `verifyIsFromGoogle`
  - include channel metadata and signed channel token used to validate origin

Operational example (`/api/sync/maintain-all`):

```bash
curl -i -X POST \
  -H "x-comp-token: $TOKEN_COMPASS_SYNC" \
  /api/sync/maintain-all
```

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
- `requireGoogleConnectionSession` - Requires Google OAuth connection for Google-dependent routes
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

- `/api/auth/session` - dev session helper route
- `/api/signinup`, `/api/signout`, `/api/session/*` - SuperTokens OAuth/session APIs
- SuperTokens EmailPassword APIs (invoked through SDK methods in auth form hooks)
- `/api/user/*` - User profile and metadata
- `/api/event/*` - Calendar event CRUD operations
- `/api/calendars/*` - Calendar list and selection
- `/api/sync/*` - Google Calendar synchronization
- `/api/priority/*` - Task priority management
- `/api/health` - service health and database reachability check

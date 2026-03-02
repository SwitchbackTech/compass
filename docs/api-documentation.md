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

---

## User Routes

**Source**: `packages/backend/src/user/user.routes.config.ts`

### /api/user/profile

### /api/user/metadata

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

### /api/sync/maintain-all

### /api/sync/import-gcal

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

## Key Endpoints

- `/api/auth/*` - Authentication and OAuth flows
- `/api/user/*` - User profile and metadata
- `/api/event/*` - Calendar event CRUD operations
- `/api/calendars/*` - Calendar list and selection
- `/api/sync/*` - Google Calendar synchronization
- `/api/priority/*` - Task priority management

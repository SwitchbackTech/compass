# Google Sync And Websocket Flow

Compass sync is bidirectional:

- Compass-originated event changes can propagate to Google and then notify web clients.
- Google-originated changes can flow back into Compass and then notify web clients.

## Shared Event Names

Source:

- `packages/core/src/constants/websocket.constants.ts`

Important server-to-client events:

- `EVENT_CHANGED`
- `SOMEDAY_EVENT_CHANGED`
- `USER_METADATA`
- `IMPORT_GCAL_START`
- `IMPORT_GCAL_END`
- `GOOGLE_REVOKED`

## Outbound Flow: User Changes An Event In Compass

High-level path:

1. UI dispatches an event action.
2. A saga performs optimistic updates.
3. The selected repository writes locally or remotely.
4. Remote event writes hit backend event routes.
5. `EventController` packages the change as a `CompassEvent`.
6. `CompassSyncProcessor.processEvents()` parses the event transition and applies persistence/sync logic.
7. After commit, the backend emits websocket notifications based on whether the change affected normal or someday events.

Primary files:

- `packages/web/src/ducks/events/sagas/event.sagas.ts`
- `packages/web/src/common/repositories/event`
- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/sync/services/sync/compass.sync.processor.ts`

## Inbound Flow: Google Notifies Compass About Changes

High-level path:

1. Google posts to the notification endpoint in sync routes.
2. Backend verifies the request origin.
3. `SyncService.handleGcalNotification()` locates the watch and sync record.
4. The service builds a Google Calendar client for the user.
5. `GCalNotificationHandler` fetches incremental changes using the stored sync token.
6. `GcalSyncProcessor` applies those changes to Compass data.
7. The websocket server emits `EVENT_CHANGED` so clients refetch.

Primary files:

- `packages/backend/src/sync/sync.routes.config.ts`
- `packages/backend/src/sync/services/sync.service.ts`
- `packages/backend/src/sync/services/notify/handler/gcal.notification.handler.ts`
- `packages/backend/src/sync/services/sync/gcal.sync.processor.ts`

### Notification Outcomes And Error Semantics

`SyncService.handleGcalNotification()` and `SyncController.handleGoogleNotification()` intentionally treat several conditions as recoverable:

- returns `"INITIALIZED"` when Google sends `resourceState=sync`
- returns `"IGNORED"` when no active watch or sync record exists (stale notification)
- returns `"PROCESSED..."` when a notification is handled and client notify logic runs

Important error handling behavior:

- missing refresh token:
  - if a matching watch exists, backend prunes Google data and emits `GOOGLE_REVOKED`, then returns `410` with `{ code: "GOOGLE_REVOKED", ... }`
  - if no watch exists, backend logs and returns `410` without pruning (notification ignored)
- missing sync token:
  - backend attempts forced resync in background
  - resync is skipped if metadata already shows `sync.importGCal === "importing"`
  - response is `204` either way
- invalid/revoked Google token (`invalid_grant`):
  - backend prunes Google data, emits `GOOGLE_REVOKED`, returns revoked payload

## Watch And Sync Records

Two backend data concepts matter:

- watch records track Google push channels
- sync records track sync tokens and per-resource state

If notification handling fails because a watch or sync record is stale, the backend attempts cleanup before failing hard.

## Websocket Server Responsibilities

Source:

- `packages/backend/src/servers/websocket/websocket.server.ts`

The websocket server:

- binds the authenticated session to each socket
- tracks sockets by session and by user
- emits events to one session or all active sessions for a user
- responds to `FETCH_USER_METADATA` by returning `USER_METADATA`
- checks token state on socket connection and immediately emits `GOOGLE_REVOKED` when a user has a Google ID but no refresh token

## Web Client Responsibilities

Files:

- `packages/web/src/socket/hooks/useSocketConnection.ts`
- `packages/web/src/socket/hooks/useEventSync.ts`
- `packages/web/src/socket/hooks/useGcalSync.ts`

The client:

- connects only when user/session state warrants it
- refetches events after background changes
- tracks Google import status
- handles Google revocation
- requests metadata used to decide whether import should start
- reconciles import UI state from `USER_METADATA` when auth/import websocket events arrive out of order

## Revoked Token And Reconnect Lifecycle

Revocation and reconnect are handled across auth, sync, websocket, and repository selection:

1. Backend detects missing/invalid Google refresh token (middleware, sync, or Google API error handling).
2. Backend prunes Google-origin data and emits `GOOGLE_REVOKED`.
3. Web app marks Google as revoked in session memory and temporarily switches to local repository behavior.
4. User initiates re-consent via OAuth flow.
5. Backend auth handler (`handleGoogleAuth`) determines auth mode server-side using:
   - User existence (via `findCompassUserBy`)
   - Refresh token presence (`user.google.gRefreshToken`)
   - Sync health (`canDoIncrementalSync`)
6. If user exists but refresh token is missing or sync is unhealthy → `RECONNECT_REPAIR` path via `repairGoogleConnection()`.
7. Reconnect updates Google credentials, marks metadata sync flags as `"restart"`, and restarts sync in background.

### Auth Mode Classification

The backend determines auth mode based on server-side state, and the client only launches OAuth plus reacts to metadata/socket updates:

| Condition                                             | Auth Mode            | Handler                    |
| ----------------------------------------------------- | -------------------- | -------------------------- |
| No linked Compass user                                | `SIGNUP`             | `googleSignup()`           |
| User exists + missing refresh token OR unhealthy sync | `RECONNECT_REPAIR`   | `repairGoogleConnection()` |
| User exists + valid refresh token + healthy sync      | `SIGNIN_INCREMENTAL` | `googleSignin()`           |

Note: Frontend reconnect intent is no longer used for routing. The server is the source of truth for auth mode selection.

Primary files:

- `packages/backend/src/common/middleware/supertokens.middleware.ts`
- `packages/backend/src/auth/services/google/google.auth.success.service.ts`
- `packages/backend/src/auth/services/compass.auth.service.ts`
- `packages/web/src/auth/google/google.auth.state.ts`
- `packages/web/src/auth/google/google.auth.util.ts`
- `packages/web/src/common/repositories/event/event.repository.util.ts`

## User Metadata Shape Used By Socket And UI

`UserMetadata` now includes Google connection state alongside sync state:

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

`hasRefreshToken` is enriched server-side during metadata fetch and is available through:

- `GET /api/user/metadata`
- websocket `USER_METADATA` responses to `FETCH_USER_METADATA`

## Import Flow

Google import progress is also realtime:

1. backend starts import
2. websocket emits `IMPORT_GCAL_START`
3. client waits for metadata/socket updates from the backend import flow
4. backend completes import and emits `IMPORT_GCAL_END`
5. client stores import results and triggers a refetch

## Rules Of Thumb For Changes

- New realtime behavior usually needs changes in `core`, `backend`, and `web`.
- If you add a new websocket event, update both shared event types/constants and both emit/listen sides.
- If you change sync token behavior, inspect both notification handling and import logic.
- If the UI is stale after edits, confirm a socket event is emitted and that the right sync slice action is dispatched on the client.

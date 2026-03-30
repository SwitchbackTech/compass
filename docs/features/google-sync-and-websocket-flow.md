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

### `IMPORT_GCAL_END` Payload Contract

Source files:

- `packages/core/src/types/websocket.types.ts`
- `packages/backend/src/sync/services/sync.service.ts`

`IMPORT_GCAL_END` now carries an explicit `operation` so the client can distinguish
repair completion from incremental completion.

```ts
type ImportGCalOperation = "INCREMENTAL" | "REPAIR";

type ImportGCalEndPayload =
  | {
      operation: ImportGCalOperation;
      status: "COMPLETED";
      eventsCount?: number;
      calendarsCount?: number;
    }
  | {
      operation: ImportGCalOperation;
      status: "ERRORED" | "IGNORED";
      message: string;
    };
```

Operational constraints:

- repair path (`restartGoogleCalendarSync`) emits `operation: "REPAIR"`
- incremental path (`importIncremental`) emits `operation: "INCREMENTAL"`
- web listeners should keep a defensive `payload?` handler for compatibility with
  older emitters/tests

## Outbound Flow: User Changes An Event In Compass

High-level path:

1. UI dispatches an event action.
2. A saga performs optimistic updates.
3. The selected repository writes locally or remotely.
4. Remote event writes hit backend event routes.
5. `EventController` packages the change as a `CompassEvent`.
6. `CompassSyncProcessor.processEvents()`:
   - loads the current DB event
   - analyzes the transition into a `CompassOperationPlan`
   - applies Compass persistence steps
   - executes any Google side effect implied by the plan
7. After commit, the backend emits websocket notifications based on whether the change affected normal or someday events.

Primary files:

- `packages/web/src/ducks/events/sagas/event.sagas.ts`
- `packages/web/src/common/repositories/event`
- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/compass.event.executor.ts`
- `packages/backend/src/sync/services/sync/compass/compass.sync.processor.ts`

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
- `packages/backend/src/sync/services/sync/google/gcal.sync.processor.ts`

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
  - resync is skipped if metadata already shows `sync.importGCal === "IMPORTING"`
  - response is `204` either way
- invalid/revoked Google token (`invalid_grant`):
  - backend prunes Google data, emits `GOOGLE_REVOKED`, returns revoked payload
- invalid/revoked token during repair flow:
  - backend repair catches `invalid_grant`, prunes Google data, emits
    `GOOGLE_REVOKED`, and exits repair without sending `IMPORT_GCAL_END` with
    `status: "ERRORED"`

## Watch And Sync Records

Two backend data concepts matter:

- watch records track Google push channels
- sync records track sync tokens and per-resource state

If notification handling fails because a watch or sync record is stale, the backend attempts cleanup before failing hard.

### Watch Channel Persistence Model

Source files:

- `packages/core/src/types/watch.types.ts`
- `packages/backend/src/sync/services/sync.service.ts`
- `packages/backend/src/sync/controllers/sync.controller.ts`

Current contract:

- `watch` collection is the source of truth for active Google push channels
- each watch stores:
  - `_id` (Mongo ObjectId) -> Google channel id (`x-goog-channel-id`)
  - `resourceId` -> Google resource id (`x-goog-resource-id`)
  - `gCalendarId` -> watched calendar id (or `Resource_Sync.CALENDAR` for calendar-list watches)
  - `expiration` -> channel expiry timestamp
  - `user` -> owning Compass user id
- `sync` collection remains the source of sync tokens (`nextSyncToken`) and resource state

Runtime correlation rules:

- notification handling first matches `watch` by `_id`, `resourceId`, and non-expired channel
- if no matching watch exists, backend attempts stale-watch cleanup and returns `"IGNORED"`
- if watch exists but no sync record exists, backend also attempts stale-watch cleanup and returns `"IGNORED"`
- if watch + sync exist but no `nextSyncToken` exists, controller triggers forced background resync and returns `204`

### Watch Lifecycle Operations

Primary write paths:

- create calendar watch: `startWatchingGcalCalendars(...)`
- create events watch: `startWatchingGcalEvents(...)`
- stop one watch: `stopWatch(...)`
- stop all user watches: `stopWatches(...)`

Error semantics during stop:

- Google `404` channel-not-found -> delete watch record locally and continue
- Google `401` / invalid token -> delete watch record locally and continue
- missing refresh token -> delete watch record locally and continue

This makes watch cleanup idempotent for stale or already-invalid Google channels.

### Logout Cleanup and Watch Teardown

Source files:

- `packages/backend/src/common/middleware/supertokens.middleware.handlers.ts`
- `packages/backend/src/user/services/user.service.ts`

On `POST /api/signout`, backend cleanup is intentionally decoupled from the sign-out response:

1. SuperTokens `signOutPOST` runs first.
2. Backend calls `userService.handleLogoutCleanup(userId, { isLastActiveSession })`.
3. Cleanup behavior:
   - for users with Google connection data (`googleId` or `gRefreshToken`), set:
     - `sync.incrementalGCalSync = "RESTART"`
   - if this is the last active session, stop all user watches (`syncService.stopWatches`)
4. If cleanup throws, backend logs the error and still returns the sign-out response.

Operational implication:

- logout remains reliable even when downstream watch cleanup fails
- the next authenticated flow can re-enter incremental sync from a known metadata state

### Watch Triage Checklist

When Google notifications repeatedly return `"IGNORED"` or no client refresh occurs:

1. verify watch exists for the incoming channel/resource pair:
   - `_id == x-goog-channel-id`
   - `resourceId == x-goog-resource-id`
2. verify watch `expiration` is still valid
3. verify matching sync entry has `nextSyncToken` for that `gCalendarId` in:
   - `google.events[*]` for event notifications
   - `google.calendarlist[*]` for calendar-list notifications
4. check for cleanup/recovery logs:
   - `Cleaned up stale watch...`
   - `Ignoring notification because no active watch record exists...`
   - `Recovering Google sync after missing sync token`
5. if channels are broadly stale, run maintenance (`/api/sync/maintain-all`) or re-run full import for affected users

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
- requests `USER_METADATA` to drive connection-state UI and import restart decisions
- auto-starts import only when metadata says `sync.importGCal === "RESTART"` and the Google connection is usable
- tracks a dedicated repair-in-progress state (`isRepairing`) separate from
  background incremental sync (`isProcessing`)
- only shows a toast for repair failures, and de-duplicates it with a stable toast id
  (`GOOGLE_REPAIR_FAILED_TOAST_ID`)

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
7. Reconnect updates Google credentials, marks metadata sync flags as `"RESTART"`, and restarts sync in background.

### Auth Mode Classification

The backend determines auth mode based on server-side state, and the client only launches OAuth plus reacts to metadata/socket updates:

| Condition                                             | Auth Mode            | Handler                    |
| ----------------------------------------------------- | -------------------- | -------------------------- |
| No linked Compass user                                | `SIGNUP`             | `googleSignup()`           |
| User exists + missing refresh token OR unhealthy sync | `RECONNECT_REPAIR`   | `repairGoogleConnection()` |
| User exists + valid refresh token + healthy sync      | `SIGNIN_INCREMENTAL` | `googleSignin()`           |

Note: Frontend reconnect intent is no longer used for routing. The server is the source of truth for auth mode selection.

### Connect Google Later (After Password-Only Usage)

When a user authenticates with email/password first and connects Google later
from an existing session:

1. the web client completes the Google popup flow
2. `useConnectGoogle()` first calls `syncPendingLocalEvents(dispatch)` so
   IndexedDB-only Compass events are pushed before any Google refresh
3. if local sync fails, connect is aborted and the user sees:
   - `We could not sync your local events. Your changes are still saved on this device.`
4. on successful local sync, `useConnectGoogle()` sends the auth-code payload
   to `POST /api/auth/google/connect`
5. backend `connectGoogleToCurrentUser()` attaches Google credentials to the
   existing Compass user
6. backend marks sync metadata as `"RESTART"`
7. background import/watch sync is restarted

Operational constraints:

- this path no longer depends on SuperTokens `AccountLinking`
- Google-account ownership is checked server-side by `google.googleId`
- connect is intentionally blocked when local event sync fails; this prevents
  local-only Compass events from disappearing during Google-triggered refresh
- restart still follows the same metadata/socket lifecycle
  (`IMPORT_GCAL_START`, metadata transitions, `IMPORT_GCAL_END`)

Primary files:

- `packages/backend/src/common/middleware/supertokens.middleware.ts`
- `packages/backend/src/auth/services/google/google.auth.service.ts`
- `packages/backend/src/auth/controllers/auth.controller.ts`
- `packages/web/src/auth/google/google.auth.state.ts`
- `packages/web/src/auth/google/google.auth.util.ts`
- `packages/web/src/auth/hooks/google/useConnectGoogle/useConnectGoogle.ts`
- `packages/web/src/common/repositories/event/event.repository.util.ts`

### Connect-Later Ownership Conflict Triage

If `POST /api/auth/google/connect` returns `409` while a user is trying to
connect Google from an existing password session:

1. confirm whether the Google account is already linked by checking for an
   existing Compass user with the same `google.googleId`
2. verify backend conflict payload:
   - `result: "User not connected"`
   - `message: "Google account is already connected to another Compass user"`
3. verify no reconnect side effects were applied for the current session user:
   - no new Google credential write
   - no metadata transition to `sync.importGCal = "RESTART"`
   - no reconnect/import websocket lifecycle (`IMPORT_GCAL_START` /
     `IMPORT_GCAL_END`) for that failed request

Expected operator action:

- treat as ownership protection, not as an OAuth transport failure
- have the user authenticate into the Compass account that already owns that
  Google identity (or disconnect/recover ownership through an explicit support
  path)

## User Metadata Shape Used By Socket And UI

`UserMetadata` includes Google connection state alongside sync state:

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

Google metadata fields are enriched server-side during metadata fetch and are available through:

- `GET /api/user/metadata`
- websocket `USER_METADATA` responses to `FETCH_USER_METADATA`

### Google Metadata Status Semantics

Source files:

- `packages/backend/src/user/services/user-metadata.service.ts`
- `packages/core/src/types/user.types.ts`
- `packages/web/src/socket/hooks/useGcalSync.ts`

`connectionState` values are uppercase string literals shared across backend and web:

- `NOT_CONNECTED`: no linked Google account
- `RECONNECT_REQUIRED`: Google account linked but refresh token missing
- `IMPORTING`: import or repair is currently running (`sync.importGCal` is `"IMPORTING"` or `"RESTART"`)
- `HEALTHY`: sync watches/tokens are healthy
- `ATTENTION`: Google is linked, but sync needs repair

Auto-import guardrail in realtime flow:

- client auto-starts import only when `sync.importGCal === "RESTART"` **and** `google.connectionState` is not `NOT_CONNECTED` or `RECONNECT_REQUIRED`
- if connection-state casing drifts (for example lowercase values), this guard does not match and auto-import will not trigger

## Import Flow

Google import progress is also realtime:

1. backend starts import
2. websocket emits `IMPORT_GCAL_START`
3. client waits for metadata/socket updates from the backend import flow
4. backend completes import and emits `IMPORT_GCAL_END`
5. client stores import results and triggers a refetch

### Operation-Aware Import Completion Semantics

Source files:

- `packages/web/src/socket/hooks/useGcalSync.ts`
- `packages/web/src/auth/hooks/google/useConnectGoogle/useConnectGoogle.ts`
- `packages/web/src/ducks/events/slices/sync.slice.ts`

`IMPORT_GCAL_END` handling is operation-aware:

- `operation: "REPAIR"`
  - always stops repair spinner/state
  - `ERRORED`:
    - stores `importError`
    - shows one repair-failure toast (de-duped by id)
  - `COMPLETED`:
    - stores import counts in `importResults`
    - triggers an events refetch
  - `IGNORED`: no refetch
- `operation: "INCREMENTAL"`
  - does **not** alter repair spinner/state
  - `ERRORED`:
    - stores `importError`
    - does not show repair-failure toast
  - `COMPLETED`: stores counts (if provided) and refetches

Examples:

```json
{
  "operation": "REPAIR",
  "status": "COMPLETED",
  "eventsCount": 42,
  "calendarsCount": 3
}
```

```json
{
  "operation": "INCREMENTAL",
  "status": "ERRORED",
  "message": "Incremental Google Calendar sync failed for user: 123"
}
```

### Repair Failure Messaging

Source files:

- `packages/backend/src/common/services/gcal/gcal.utils.ts`
- `packages/backend/src/common/errors/integration/gcal/gcal.errors.ts`
- `packages/backend/src/user/services/user.service.ts`

Repair failures now normalize to two user-facing message classes:

- quota/rate-limit errors from Google (`403`/`429` with quota-style reasons or messages):
  - `"Google Calendar repair hit a Google API limit. Please wait a few minutes and try again."`
- all other repair failures:
  - `"Google Calendar repair failed. Please try again."`

### Manual Import Trigger Contract

Source files:

- `packages/backend/src/sync/sync.routes.config.ts`
- `packages/backend/src/sync/controllers/sync.controller.ts`
- `packages/backend/src/sync/sync.types.ts`
- `packages/backend/src/user/services/user.service.ts`

`POST /api/sync/import-gcal` request body is validated with:

```ts
{ force?: boolean }
```

Behavior:

- `force: true` calls `restartGoogleCalendarSync(userId, { force: true })`
- forced restarts still do **not** start if an import is already `"IMPORTING"`
- omitted/false uses standard metadata guardrails (`shouldImportGCal`)
- endpoint returns `204` immediately; import progress is asynchronous via websocket events

## Rules Of Thumb For Changes

- New realtime behavior usually needs changes in `core`, `backend`, and `web`.
- If you add a new websocket event, update both shared event types/constants and both emit/listen sides.
- If you change sync token behavior, inspect both notification handling and import logic.
- If the UI is stale after edits, confirm a socket event is emitted and that the right sync slice action is dispatched on the client.

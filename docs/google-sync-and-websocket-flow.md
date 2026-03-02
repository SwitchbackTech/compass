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

## Import Flow

Google import progress is also realtime:

1. backend starts import
2. websocket emits `IMPORT_GCAL_START`
3. client marks import pending
4. backend completes import and emits `IMPORT_GCAL_END`
5. client stores import results and triggers a refetch

## Rules Of Thumb For Changes

- New realtime behavior usually needs changes in `core`, `backend`, and `web`.
- If you add a new websocket event, update both shared event types/constants and both emit/listen sides.
- If you change sync token behavior, inspect both notification handling and import logic.
- If the UI is stale after edits, confirm a socket event is emitted and that the right sync slice action is dispatched on the client.

# Frontend Runtime Flow

This document describes how the web app boots and where runtime responsibilities live.

## Boot Sequence

Primary entrypoint:

- `packages/web/src/index.tsx`

Boot order:

1. initialize local storage through `initializeDatabaseWithErrorHandling()`
2. start redux-saga with `sagaMiddleware.run(sagas)`
3. initialize session tracking with `sessionInit()`
4. render `<App />`
5. show a toast if local database initialization failed

This order matters because storage should be ready before sagas and repositories perform local operations.

## App Provider Tree

`packages/web/src/components/App/App.tsx` renders:

- keyboard and movement event setup hooks
- optional providers
- required providers
- router provider

The route tree lazily loads feature views.

## Router Flow

Files:

- `packages/web/src/routers/index.tsx`
- `packages/web/src/routers/loaders.ts`

Important behavior:

- the root route loads `RootView`
- the day route redirects to today's date when needed
- `loadAuthenticated()` checks whether a session exists
- route loaders use shared date parsing from `core`

## Root View Responsibilities

`packages/web/src/views/Root.tsx`:

- blocks mobile with `MobileGate`
- wraps authenticated layout with `UserProvider`
- wires socket listeners through `SocketProvider`

This is the shell for the main desktop app experience.

## Session Runtime

File:

- `packages/web/src/auth/session/SessionProvider.tsx`

Responsibilities:

- initialize SuperTokens recipes
- track auth state in a `BehaviorSubject`
- mark users as having authenticated
- connect or disconnect sockets on session changes
- expose a React context for auth status

Important detail:

Once a user has ever authenticated, the app records that fact in local auth-state storage so repository selection can prefer remote data later.

When a user re-authenticates with Google, auth-state utilities also clear any in-memory "Google revoked" flag so normal remote sync can resume.

## Google OAuth Popup Cancellation Semantics

Files:

- `packages/web/src/auth/hooks/oauth/useGoogleAuth.ts`
- `packages/web/src/components/oauth/google/useGoogleLogin.ts`
- `packages/web/src/auth/google/google-oauth-error.util.ts`

The web auth flow intentionally treats popup-close outcomes as cancellation, not authentication failure.

Cancellation detection (`isGooglePopupClosedError`) returns true when any of these match:

- `type === "popup_closed"`
- `error`, `error_description`, or `message` equals `"popup_closed"` (case-insensitive)
- `error`, `error_description`, or `message` contains `"popup window closed"` (case-insensitive)

When cancellation is detected in the auth hooks:

- auth state is reset (`resetAuth`)
- import overlay/progress flags are cleared (`setIsImportPending(false)`, `importing(false)`)
- generic auth failure state is not dispatched for that event

For non-cancellation errors, normal auth-failure handling still applies.

## User Bootstrap

File:

- `packages/web/src/auth/context/UserProvider.tsx`

Responsibilities:

- fetch the user profile only for users who have authenticated before
- avoid blocking unauthenticated users
- show a session-expired toast on auth failures
- identify the user in PostHog when enabled

## State Systems

The web app uses multiple state layers:

- Redux Toolkit reducers and slices for app and async state
- redux-saga for network/storage side effects
- Elf for event entity store, active event, and draft state
- IndexedDB for local persistence

Read these together for event work:

- `packages/web/src/store/index.ts`
- `packages/web/src/store/sagas.ts`
- `packages/web/src/ducks/events/sagas`
- `packages/web/src/store/events.ts`

## Repository Selection

File:

- `packages/web/src/common/repositories/event/event.repository.util.ts`

Repository choice:

- if Google access is revoked in-session, force local IndexedDB repository
- otherwise, never-authenticated users use local IndexedDB repositories
- authenticated or previously-authenticated users use remote repositories

This is deliberate and prevents events from "disappearing" after login when local data is empty.

Revoked state details:

- stored in memory only (not persisted)
- set when `GOOGLE_REVOKED` is detected from socket or API error responses
- cleared when Google auth succeeds again

## Storage Initialization

Files:

- `packages/web/src/common/storage/adapter/adapter.ts`
- `packages/web/src/common/storage/migrations/migrations.ts`

Startup storage flow:

1. create or reuse the storage adapter singleton
2. open IndexedDB and run internal schema migrations
3. run data migrations
4. run external import migrations

Database init failure is non-fatal; the app falls back to remote-only behavior when possible.

## Websocket Runtime

Files:

- `packages/web/src/socket/provider/SocketProvider.tsx`
- `packages/web/src/socket/hooks/useSocketConnection.ts`
- `packages/web/src/socket/hooks/useEventSync.ts`
- `packages/web/src/socket/hooks/useGcalSync.ts`

Responsibilities:

- connect/disconnect the socket based on auth state
- refetch events when background event changes arrive
- react to Google import progress and Google revocation events
- request user metadata via socket when appropriate

Runtime nuances:

- `useGcalSync` keeps an `isImportPending` ref to avoid races with async socket events.
- `USER_METADATA` is used to reconcile post-auth import UI state (importing/completed/errored).
- On connect, backend may proactively emit `GOOGLE_REVOKED`; the client clears Google-origin events and falls back to local event storage until reconnect.

## What To Read Before Editing

- Auth/session issue: read session provider, user provider, router loaders.
- Event refresh issue: read socket hooks, sync slice, event sagas.
- Offline issue: read storage adapter and migration runner.
- Rendering issue in day/week/now: start at the route view, then its hooks.

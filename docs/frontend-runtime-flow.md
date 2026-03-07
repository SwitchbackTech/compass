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

- never-authenticated users use local IndexedDB repositories
- authenticated or previously-authenticated users use remote repositories

This is deliberate and prevents events from "disappearing" after login when local data is empty.

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

## Week Shortcut -> Someday Draft Flow

Files:

- `packages/web/src/views/Calendar/hooks/shortcuts/useWeekShortcuts.ts`
- `packages/web/src/views/Calendar/components/Draft/sidebar/hooks/useSidebarActions.ts`

For the week view `w` shortcut:

1. `useWeekShortcuts` handles keyup `w` and calls `createSomedayDraft(..., "createShortcut")`.
2. `createSomedayDraft` dispatches the redux draft start action for Someday creation.
3. For `activity === "createShortcut"`, it intentionally does **not** call `createDefaultSomeday()` directly.
4. `handleChange()` then opens the Someday form from the redux draft state in one place.

This one-path opening behavior prevents duplicate open paths and keeps shortcut behavior deterministic for both users and e2e tests.

## What To Read Before Editing

- Auth/session issue: read session provider, user provider, router loaders.
- Event refresh issue: read socket hooks, sync slice, event sagas.
- Offline issue: read storage adapter and migration runner.
- Rendering issue in day/week/now: start at the route view, then its hooks.

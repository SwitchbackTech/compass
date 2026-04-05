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
- wires SSE listeners through `SSEProvider`

This is the shell for the main desktop app experience.

## Session Runtime

File:

- `packages/web/src/auth/session/SessionProvider.tsx`

Responsibilities:

- initialize SuperTokens recipes
- track auth state in a `BehaviorSubject`
- mark users as having authenticated
- open or close the SSE stream on session changes
- expose a React context for auth status

Important detail:

Once a user has ever authenticated, the app records that fact in local auth-state storage so repository selection can prefer remote data later.

When a user re-authenticates with Google, auth-state utilities also clear any in-memory "Google revoked" flag so normal remote sync can resume.

## Google OAuth Popup Cancellation Semantics

Files:

- `packages/web/src/auth/hooks/google/useGoogleAuth/useGoogleAuth.ts`
- `packages/web/src/auth/hooks/google/useGoogleLogin/useGoogleLogin.ts`
- `packages/web/src/auth/google/google-oauth-error.util.ts`

The web auth flow intentionally treats popup-close outcomes as cancellation, not authentication failure.

Cancellation detection (`isGooglePopupClosedError`) returns true when any of these match:

- `type === "popup_closed"`
- `error`, `error_description`, or `message` equals `"popup_closed"` (case-insensitive)
- `error`, `error_description`, or `message` contains `"popup window closed"` (case-insensitive)

When cancellation is detected in the auth hooks:

- auth state is reset (`resetAuth`)
- OAuth overlay closes because `selectIsAuthenticating` becomes false
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

## Client Version Polling

Files:

- `packages/web/src/common/hooks/useVersionCheck.ts`
- `packages/web/src/views/Calendar/components/Sidebar/SidebarIconRow/SidebarIconRow.tsx`

Runtime behavior:

- version checks are disabled in development mode
- in non-dev mode, the client checks on mount, then every 5 minutes
- the client also checks when a tab returns to visible after being hidden for at least 30 seconds
- requests use an absolute URL built from `window.location.origin` (`/version.json?t=<timestamp>`) with no-store/no-cache fetch options
- checks are de-duplicated so concurrent visibility/interval triggers do not issue overlapping fetches

When the server version differs from `BUILD_VERSION`, `isUpdateAvailable` becomes `true` and the sidebar shows a refresh action that triggers `window.location.reload()`.

## Calendar Sidebar Footer Controls

Files:

- `packages/web/src/views/Calendar/components/Sidebar/Sidebar.tsx`
- `packages/web/src/views/Calendar/components/Sidebar/SidebarIconRow/SidebarIconRow.tsx`
- `packages/web/src/views/Calendar/components/Sidebar/styled.ts`
- `packages/web/src/auth/hooks/google/useConnectGoogle/useConnectGoogle.ts`

Layout contract:

- the footer control row is pinned to the bottom of the sidebar (`ICON_ROW_HEIGHT = 40`)
- `SidebarTabContainer` reserves space with `height: calc(100% - 40px)` so tab content does not overlap the footer row
- the row uses `justify-content: space-between` and two explicit groups:
  - `LeftIconGroup`: sidebar tab navigation actions
  - `RightIconGroup`: utility and status actions

Control mapping:

- Left group:
  - Tasks tab (`SHIFT + 1`) dispatches `viewSlice.actions.updateSidebarTab("tasks")`
  - Month tab (`SHIFT + 2`) dispatches `viewSlice.actions.updateSidebarTab("monthWidget")`
- Right group:
  - Command palette toggle (`modifier + K`) dispatches open/close palette actions from `settingsSlice`
  - Google status action is derived from `useConnectGoogle().sidebarStatus`
  - background import spinner is shown while `selectImportGCalState(...).importing` is true
  - update action (refresh icon) is shown when `useVersionCheck().isUpdateAvailable` is true and reloads the page

Icon state constraints:

- tab icons and command icon use `theme.color.text.light` when active and `theme.color.text.darkPlaceholder` when inactive
- Google status icon tooltips and disabled/clickable behavior come from `useConnectGoogle` and should not be hardcoded in the row component

## Dedication Dialog Runtime

Files:

- `packages/web/src/views/Calendar/components/Dedication/Dedication.tsx`
- `packages/web/src/views/Calendar/Calendar.tsx`
- `packages/web/src/views/Day/view/DayViewContent.tsx`

Runtime behavior:

- the dialog is mounted in both day and week roots, so the same dedication UI is reachable in both views
- `ctrl+shift+0` toggles the dialog
- `escape` closes the dialog only when it is open
- the component uses native `HTMLDialogElement` APIs (`showModal`, `close`) instead of `react-modal`

Transition/close contract:

- opening calls `showModal()` first, then sets `isVisible` in `requestAnimationFrame` so CSS transitions can animate from hidden -> visible
- closing sets `isVisible` to `false` and waits for `onTransitionEnd` before calling `dialog.close()`
- `onCancel` calls `preventDefault()` and routes through the same close path so Escape/cancel actions do not skip exit animations

Pitfalls:

- do not call `dialog.close()` directly in new close handlers unless you intentionally want to bypass the fade/scale exit animation
- keep imports pointed at `.../Dedication/Dedication` (no barrel file in this folder)

## Day/Now Shortcuts Sidebar Runtime

Files:

- `packages/web/src/common/hooks/useSidebarState.ts`
- `packages/web/src/views/Day/components/ShortcutsSidebar/ShortcutsSidebar.tsx`
- `packages/web/src/views/Day/components/Header/Header.tsx`
- `packages/web/src/views/Day/view/DayViewContent.tsx`
- `packages/web/src/views/Now/view/NowView.tsx`
- `packages/web/src/views/Day/hooks/shortcuts/useDayViewShortcuts.ts`
- `packages/web/src/views/Now/shortcuts/useNowShortcuts.ts`

Runtime behavior:

- sidebar state is responsive-first: `useSidebarState` sets open/closed from `window.innerWidth >= 1280` (`xl`) and subscribes to `matchMedia("(min-width: 1280px)")`
- breakpoint transitions are authoritative: crossing the `xl` boundary re-syncs the sidebar state even if the user manually toggled it earlier
- users can toggle via:
  - header sidebar button (`Header` tooltip + `SidebarIcon`)
  - `[` keyboard shortcut in both Day and Now views
- the sidebar is desktop-only in layout (`hidden xl:flex`), so on sub-`xl` widths toggling updates state but the sidebar content remains visually hidden
- `ShortcutsSidebar` filters out empty sections and returns `null` when no section has shortcuts

Animation and visibility contract:

- opening uses `requestAnimationFrame` to set visible state so entry transition classes apply (`translate-x-0 opacity-100`)
- closing sets hidden classes (`-translate-x-4 opacity-0`) and unmounts when closed/not visible

Pitfalls:

- `useSidebarState` reads `window` during state initialization and uses `window.matchMedia`; browser-like globals must exist in tests/non-browser runtimes
- when adding sidebar-driven interactions, verify both Day and Now routes to keep keyboard behavior aligned (`[` should work in both)

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

## Event Flow

The old "frontend data flow" doc is now folded into this section.

Typical event flow:

1. a route view, hook, or component dispatches a Redux action
2. redux-saga handles the async side effect
3. the selected repository writes locally or remotely
4. reducers and/or Elf stores update client state
5. SSE events can trigger refetch or metadata refresh later

Important consequence:

- event behavior is not owned by a single state system
- when debugging, inspect the action, saga, repository, and store layer together

## Styling Systems

The web app currently uses two styling systems in parallel:

- longstanding `styled-components` for much of the existing UI
- Tailwind v4 utilities and semantic theme tokens from `packages/web/src/index.css` for newer or migrated surfaces

Do not describe the frontend as Tailwind-only or styled-components-only. Follow the local pattern of the area you are editing unless the change is explicitly migrating that area.

## Calendar Event Card Rendering (Week Grid + All-Day Row)

Files:

- `packages/web/src/views/Calendar/components/Event/Grid/GridEvent/GridEvent.tsx`
- `packages/web/src/views/Calendar/components/Grid/AllDayRow/AllDayEvent.tsx`
- `packages/web/src/views/Calendar/layout.constants.ts`
- `packages/web/src/common/utils/position/position.util.ts`

Intent:

- keep event text readable in short time slots without visual overflow
- preserve consistent drag/resize affordances across draft, pending, placeholder, and normal states
- keep priority-based color behavior in component-level style variables

Runtime behavior:

- both components compute absolute placement and size from `getEventPosition(...)`
- event colors are derived from priority maps (`colorByPriority`, `hoverColorByPriority`) and applied via CSS variables (`--event-bg`, `--event-hover-bg`)
- pending events intentionally block drag/resize initiation on `onMouseDown` while backend confirmation is in progress
- past events are visually dimmed (`brightness(0.7)`) while current/future events use normal brightness
- `GridEvent` renders the time label only when all conditions are true:
  - event is not all-day
  - event is draft or not in the past
  - rendered height is at least `MIN_EVENT_HEIGHT_FOR_TIME_LABEL` (currently `36` px)

Interaction details to preserve:

- resize hit areas are intentionally invisible overlays (`4.5px`) with slight offsets (`-0.25px`) so resize remains easy to target without adding visual noise
- keyboard activation for event cards remains `Enter` / `Space` only, with default prevented before invoking handlers

Pitfalls:

- avoid reintroducing text overflow in short events by bypassing the `MIN_EVENT_HEIGHT_FOR_TIME_LABEL` guard
- if changing event height math, validate both label visibility and line clamp behavior (`getLineClamp`) because both depend on rendered height
- preserve pending-state interaction blocking in both grid and all-day event cards to avoid race conditions with optimistic UI updates

## Day Task Drag Handle Positioning

File:

- `packages/web/src/views/Day/components/Task/DraggableTask.tsx`

`DraggableTask` uses `@floating-ui/react` to place the reorder handle. The component explicitly strips non-finite floating coordinates (`left`/`top`) before applying styles. This avoids invalid inline styles when the layout engine cannot resolve a finite position and keeps task rows render-safe during drag-handle visibility transitions.

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
- set when `GOOGLE_REVOKED` is detected from SSE or API error responses
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

## SSE Runtime

Files:

- `packages/web/src/sse/provider/SSEProvider.tsx`
- `packages/web/src/sse/hooks/useSSEConnection.ts`
- `packages/web/src/sse/hooks/useEventSSE.ts`
- `packages/web/src/sse/hooks/useGcalSSE.ts`

Responsibilities:

- open/close `EventSource` to `GET /api/events/stream` based on auth state
- refetch events when background event changes arrive (`EVENT_CHANGED`, `SOMEDAY_EVENT_CHANGED`)
- react to Google import progress and Google revocation events
- apply `USER_METADATA` pushed on stream connect and when the backend refreshes metadata

Runtime nuances:

- `useGcalSSE` uses `USER_METADATA` as the source of truth for sync metadata and Google connection status.
- auto-import is triggered only when `sync.importGCal === "RESTART"` and `google.connectionState` is neither `NOT_CONNECTED` nor `RECONNECT_REQUIRED`.
- On connect, backend may proactively send `GOOGLE_REVOKED`; the client clears Google-origin events and falls back to local event storage until reconnect.

## Google Connection UI Contract

Files:

- `packages/web/src/auth/hooks/google/useConnectGoogle/useConnectGoogle.ts`
- `packages/web/src/auth/google/google.auth.util.ts`
- `packages/web/src/views/Calendar/components/Sidebar/SidebarIconRow/SidebarIconRow.tsx`

UI state comes from a single server-enriched metadata field (`google.connectionState`) plus one client-only loading state:

- `checking` (client-only) → disabled checking status (`SpinnerIcon`)
- `NOT_CONNECTED` → connect action (`CloudArrowUpIcon`)
- `RECONNECT_REQUIRED` → reconnect action (`LinkBreakIcon`)
- `IMPORTING` → disabled syncing status (`SpinnerIcon`)
- `HEALTHY` → disabled connected status (`LinkIcon`)
- `ATTENTION` → repair action (`CloudWarningIcon`)

Important constraint:

- `connectionState` values are uppercase string literals shared with backend/core (`NOT_CONNECTED`, `RECONNECT_REQUIRED`, `IMPORTING`, `HEALTHY`, `ATTENTION`); lowercase variants will not match UI state guards.

Connect-later guardrail:

- In the password-session "connect Google" flow, `useConnectGoogle` calls
  `syncPendingLocalEvents(dispatch)` before `AuthApi.connectGoogle(...)`.
- If local sync fails, connect is aborted and a toast is shown:
  `"We could not sync your local events. Your changes are still saved on this device."`
- This prevents IndexedDB-only Compass events from disappearing during the
  Google-triggered metadata/import refresh.

## What To Read Before Editing

- Auth/session issue: read session provider, user provider, router loaders.
- Event refresh issue: read SSE hooks, sync slice, event sagas.
- Offline issue: read storage adapter and migration runner.
- Rendering issue in day/week/now: start at the route view, then its hooks.

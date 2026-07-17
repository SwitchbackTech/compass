# Frontend Runtime Flow

This document describes how the web app boots and where runtime responsibilities live.

## Boot Sequence

Primary entrypoint:

- `packages/web/src/index.tsx`

Boot order:

1. initialize local storage through `initializeDatabaseWithErrorHandling()`
2. initialize session tracking with `sessionInit()`
3. render `<App />`
4. show a toast if local database initialization failed

This order matters because storage should be ready before listeners and repositories perform local operations.

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

- blocks mobile-OS devices with `MobileGate` (`isMobileOS` user-agent check; narrow desktop windows get the responsive layout instead)
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

## Google Authorization Redirect

Google sign-in/up and Google Calendar connect/reconnect leave Compass through a full-page Google redirect and return through `/auth/google/callback`.

Before redirecting, the web app stores a short-lived authorization intent in `sessionStorage` keyed by OAuth `state`. The callback validates that state, finishes the saved intent, removes it, and returns the user to the original same-origin path or `/day`.

The old blocking overlay is not used for Google authorization.

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

- `packages/web/src/components/PlannerSidebar/PlannerSidebarActions/useVersionCheck.ts`
- `packages/web/src/components/PlannerSidebar/PlannerSidebarActions/PlannerSidebarActions.tsx`

Runtime behavior:

- version checks are disabled in development mode
- in non-dev mode, the client checks on mount, then every 5 minutes
- the client also checks when a tab returns to visible after being hidden for at least 30 seconds
- requests use an absolute URL built from `window.location.origin` (`/version.json?t=<timestamp>`) with no-store/no-cache fetch options
- checks are de-duplicated so concurrent visibility/interval triggers do not issue overlapping fetches

When the server version differs from `BUILD_VERSION`, `isUpdateAvailable` becomes `true` and the Planner Sidebar shows a refresh action that triggers `window.location.reload()`.

## Planner Sidebar Footer Controls

Files:

- `packages/web/src/components/PlannerSidebar/PlannerSidebar.tsx`
- `packages/web/src/components/PlannerSidebar/PlannerMonthPicker/PlannerMonthPicker.tsx`
- `packages/web/src/components/PlannerSidebar/PlannerSidebarActions/PlannerSidebarActions.tsx`
- `packages/web/src/components/PlannerSidebar/ShortcutsOverlay/ShortcutsOverlay.tsx`

Layout contract:

- the Planner Sidebar is fixed at 285px wide and fills the viewport height
- the scrollable planning content reserves its own scrollbar gutter so the footer stays fixed
- the footer control row is pinned to the bottom of the sidebar
- footer actions are grouped into shortcut access on the left and utility actions on the right

Control mapping:

- Open shortcuts opens an in-sidebar keyboard shortcuts overlay.
- Command palette toggle (`modifier + K`) calls open/close palette actions from the settings Zustand store (`packages/web/src/settings/settings.store.ts`).
- Refresh appears only when `useVersionCheck()` reports an available update.
- The account row shows temporary-account or signed-in account context.
- Background Google import state is not shown in the Planner Sidebar footer.

Icon state constraints:

- shortcut and command icons use filled weight when their related overlay/palette is open
- shortcut overlay state should not replace the Planner Sidebar conceptually; closing the overlay returns to the same sidebar

## Dedication Dialog Runtime

Files:

- `packages/web/src/views/Week/components/Dedication/Dedication.tsx`
- `packages/web/src/views/Week/WeekView.tsx`
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

## State Systems

The web app uses multiple state layers:

| Concern | Use | Key files |
| --- | --- | --- |
| Event loading, fetching, read errors, and persisted entities | TanStack Query range caches | `packages/web/src/events/queries/` |
| Event create/edit/delete/convert/reorder state | TanStack Query mutations | `packages/web/src/events/mutations/` |
| Draft Event and calendar interaction state | Zustand draft store | `packages/web/src/events/stores/draft.store.ts` |
| View dates/sidebar, cmd palette, user metadata | Zustand stores | `packages/web/src/events/stores/view.store.ts`, `packages/web/src/settings/settings.store.ts`, `packages/web/src/auth/state/user-metadata.store.ts` |
| Offline persistence | IndexedDB offline data store | `packages/web/src/common/storage/offline-data/indexeddb-offline-data.store.ts` |
| Local vs remote persistence choice | Repository factory | `packages/web/src/events/repositories/event.repository.util.ts` |

These layers are intentional. Do not mirror persisted Event entities into the
Zustand stores or call IndexedDB directly from components.

Zustand stores follow one pattern: a state-only store created with
`create()(devtools(...))` plus module-level action functions (e.g.
`draftActions.discard()`) that work identically from React and non-React code.
Selectors are plain functions passed to the store hook
(`useDraftStore(selectIsDrafting)`); selectors must return primitives or
stable references (use `useShallow` if one ever builds a new object).

Read these together for event work:

- `packages/web/src/events/queries` (reads, cache utilities, and view models)
- `packages/web/src/events/mutations` (persisted writes and pending state)
- `packages/web/src/events/stores/draft.store.ts` (transient drafts only)

## Event Flow

For a high-level tour of the caching model (cache-key anatomy, reads, optimistic
writes, and what refreshes the cache), see [Event Caching](./event-caching.md).
The summary below is the runtime sequence.

Typical event **read** flow:

1. a view hook mounts a `useXEventsQuery` hook (day/week)
2. TanStack Query fetches via the pure query function against the repository
   for the reactive source (`event.repository.source.store.ts`)
3. the normalized result remains in the source- and range-aware query entry;
   pure view models derive render data directly from it
4. changing the view range re-keys the query (fetch on new ranges, instant
   render from cache on revisits within `staleTime`)

Typical event **mutation** flow:

1. a hook or interaction calls the narrow `EventMutations` interface
2. the mutation captures the active repository source and cancels Event reads
3. immutable cache utilities apply the optimistic update to matching ranges
4. failures only report the error (no rollback — a snapshot restore could
   clobber a newer concurrent edit); the last settling mutation invalidates
   `eventQueryKeys.all` so the refetch converges to canonical data
5. pending Event IDs derive from TanStack Query mutation state; they never
   block interaction — the sidebar account summary shows a syncing spinner
6. SSE events invalidate the relevant query scope (day/week) to
   refetch later; auth transitions refresh the source store and drop stale
   cache entries

Creation uses optimistic events: the UI may show a temporary `_id` before the
repository returns the durable event. Do not store optimistic ids in other state
or treat them as stable.

Important consequence:

- persisted Event behavior is owned by TanStack Query; the draft Zustand store owns only draft and interaction state
- when debugging, inspect the query key, cache utility, mutation lifecycle, and repository source together

## Styling Systems

The web app currently uses two styling systems in parallel:

- Tailwind utilities for component styling
- Tailwind v4 utilities and semantic theme tokens from `packages/web/src/index.css` for newer or migrated surfaces

Use the existing `c-*` component utility convention and semantic colors from `packages/web/src/index.css`. Runtime theme values belong in `--compass-*` CSS variables so alternate themes can override values without rebuilding component styles.

## Week Grid Drag Interaction

Dragging a saved event on the week/day calendar grid resolves the target day
from a layout cache built at drag start, not from the event's own date
arithmetic. See [Week Drag Interaction](./week-drag-interaction.md) for the
coordinate model and why it matters once the week view can render fewer than
7 days.

## Repository Selection

File:

- `packages/web/src/events/repositories/event.repository.util.ts`

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

- `packages/web/src/common/storage/offline-data/offline-data.store.registry.ts`
- `packages/web/src/common/storage/migrations/migrations.ts`

Startup storage flow:

1. create or reuse the offline data store singleton
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
- refetch events when background event changes arrive (`EVENT_CHANGED`)
- react to Google import progress and Google revocation events
- apply `USER_METADATA` pushed on stream connect and when the backend refreshes metadata

Runtime nuances:

- `useGcalSSE` uses `USER_METADATA` as the source of truth for sync metadata and Google connection status.
- auto-import is triggered only when `sync.importGCal === "RESTART"` and `google.connectionState` is neither `NOT_CONNECTED` nor `RECONNECT_REQUIRED`.
- On connect, backend may proactively send `GOOGLE_REVOKED`; the client clears Google-origin events and falls back to local event storage until reconnect.

## Google Connection UI Contract

Files:

- `packages/web/src/auth/google/hooks/useConnectGoogle/useConnectGoogle.ts`
- `packages/web/src/auth/google/hooks/useConnectGoogle/useConnectGoogle.util.ts`
- `packages/web/src/components/PlannerSidebar/PlannerAccountSummary/PlannerAccountSummary.tsx`
- `packages/web/src/components/CommandPalette/hooks/useGoogleCmdItems.ts`

UI state comes from a single server-enriched metadata field (`google.connectionState`) plus two client-only states (`checking`, `repairing`). The sidebar account email text itself is the status indicator, via `getGoogleAccountSummaryStatus`:

- `HEALTHY` → email renders normally (`text-text-light`); tooltip reads "Up-to-date"
- `ATTENTION` → email renders in `text-status-warning`; tooltip explains a sync is needed and offers a **Sync now** button (`onRepairGoogle`)
- `RECONNECT_REQUIRED` → email renders in `text-status-error`; tooltip offers a **Reconnect** button (`onOpenGoogleAuth`)
- `NOT_CONNECTED` → plain email text, no tooltip

When a status has an action, the email itself renders as a `<button>` so keyboard users can trigger the action directly (Enter/Space) without needing to hover into the tooltip. An `sr-only role="status"` live region mirrors the tooltip text so screen readers hear state transitions. User-facing copy avoids the word "repair" — the `ATTENTION` state is framed as needing a sync, not a repair.

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
- Event refresh issue: read the SSE hooks (which invalidate query scopes), the `useXEventsQuery` read hooks, `event.query.options.ts`, and `useEventMutations.ts` (which invalidates after settlement).
- Offline issue: read storage adapter and migration runner.
- Rendering issue in day/week: start at the route view, then its hooks.

# Testing Playbook

Use the smallest test surface that can fail for the change you are making, then widen only if the change crosses boundaries.

## Main Commands

From repo root:

```bash
bun run test:core
bun run test:web
bun run test:backend
bun run test:scripts
bun run type-check
```

Avoid defaulting to `bun run test` unless you really need the full suite.

## CI Unit Test Workflow

Source of truth:

- `.github/workflows/test-unit.yml`
- `.github/workflows/test-e2e.yml`

Unit workflow (`test-unit.yml`):

- triggers on `push`
- runs a matrix across `core`, `web`, `backend`, and `scripts`
- uses `fail-fast: false`, so one failing lane does not cancel the others
- runs `bun run test:<project>` in each lane after dependency install
- passes timezone through `TZ: ${{ vars.TZ }}`

Local parity commands:

```bash
bun run test:core
bun run test:web
bun run test:backend
bun run test:scripts
```

E2E workflow (`test-e2e.yml`) is separate and runs on pull requests to `main` via `bun run test:e2e`.

## Current Test Strategy

- `bun run test:core` uses `bun test` with a small compatibility preload for the core BSON mock setup.
- `bun run test:web`, `bun run test:backend`, and `bun run test:scripts` intentionally retain the existing Jest harness while their hoist-heavy module-mocking patterns are migrated.
- `bun run test:<project>` is the stable CI-facing entrypoint for every package; the root dispatcher chooses the correct runner per project.

## Retained Jest Layout

Source:

- `jest.config.js`

Projects:

- `core`
- `web`
- `backend`
- `scripts`

Each project has its own setup files and module alias mapping.

## What To Run By Change Type

### Shared type or schema change

Run:

```bash
bun run test:core && bun run test:web && bun run test:backend
bun run type-check
```

### Web-only UI or behavior change

Run:

```bash
bun run test:web
```

Add `bun run test:core` if the change touched shared utilities.

### Backend route or service change

Run:

```bash
bun run test:backend
```

Add `bun run test:core` if a shared type or mapper changed.

### CLI, migration, or seeder change

Run:

```bash
bun run test:scripts
```

## Web Test Style

Preferred style:

- React Testing Library
- semantic queries by role/name/text
- `user-event` for real interactions

Avoid:

- CSS selectors
- implementation-detail assertions
- unnecessary module-wide mocks

### Web Jest Harness Defaults (MSW + Globals)

Primary setup files:

- `packages/web/src/__tests__/web.test.start.ts`
- `packages/web/src/__tests__/__mocks__/server/mock.handlers.ts`

Current defaults worth knowing:

- MSW runs in strict mode: `server.listen({ onUnhandledRequest: "error" })`
- unhandled HTTP requests fail the test (instead of silently passing)
- IndexedDB is provided by `fake-indexeddb/auto`
- `structuredClone` is polyfilled for test environments that do not provide it
- SuperTokens session existence is reset to `true` in `beforeEach`

Important built-in handlers include:

- `GET http://localhost/version.json` (used by `useVersionCheck`)
- event and user profile/metadata routes under `ENV_WEB.API_BASEURL`
- `POST /session/refresh` with both token headers and token cookies

When a component/hook introduces a new request, add a handler in the test (or shared handlers) rather than disabling strict mode.

Example per-test override:

```tsx
import { rest } from "msw";
import { server } from "@web/__tests__/__mocks__/server/mock.server";

server.use(
  rest.get("http://localhost/version.json", (_req, res, ctx) => {
    return res(ctx.json({ version: "1.2.3" }));
  }),
);
```

### Warning-Free React Updates

When a test drives React state updates outside simple one-off interactions, wrap the update sequence in `act` imported from `react`.

```tsx
import { act } from "react";
```

Use this pattern for:

- grouped `user-event` interactions that trigger multiple updates
- manual callback triggers (for example `matchMedia` change handlers)
- awaiting async values returned from spies before asserting final UI state

Example:

```tsx
await act(async () => {
  await user.type(screen.getByLabelText(/email/i), "invalid");
  await user.tab();
});
```

### Testing Responsive Sidebar State (`useSidebarState`)

Files:

- `packages/web/src/common/hooks/useSidebarState.ts`
- `packages/web/src/views/Day/components/ShortcutsSidebar/ShortcutsSidebar.tsx`
- `packages/web/src/views/Day/view/DayViewContent.tsx`
- `packages/web/src/views/Now/view/NowView.tsx`

Reliable setup pattern:

- set `window.innerWidth` explicitly in each test scenario (`>= 1280` for open, `< 1280` for closed)
- mock `window.matchMedia` with `addEventListener`/`removeEventListener` support
- expose a small test helper to trigger media-query changes and wrap the trigger in `act`

Assertions to prefer:

- query the sidebar by landmark role and label (`role="complementary"`, `name: "Shortcuts sidebar"`)
- verify both pathways for toggle behavior:
  - user interaction (header toggle button)
  - keyboard interaction (`[` shortcut via view shortcut hooks)

### Route-Aware Component Tests

For components that depend on routing context (`Outlet`, nested routes, route transitions), prefer the shared memory-router helper:

- `packages/web/src/__tests__/utils/providers/MemoryRouter.tsx`

Pass `initialEntries` when asserting nested or non-root routes.

### Global And Console Cleanup

If a test overrides globals (for example `window.location` or `window.indexedDB`) or spies on `console.*`, always restore them in teardown (`afterEach`/`afterAll`) to prevent cross-test leakage and noisy output.

## Backend Test Style

Preferred style:

- controller/service behavior tests
- realistic request flows when possible
- mock only external services, not internal business logic

**Do not import `mongoService` (or other persistence implementations) directly in tests.** Use test drivers instead (e.g. `UserDriver`, `WatchDriver` in `packages/backend/src/__tests__/drivers/`). Drivers encapsulate persistence so that switching away from Mongo (or another store) in the future does not require changing test code.

Useful anchors:

- `packages/backend/src/__tests__`
- `packages/backend/src/__tests__/drivers/`
- `packages/backend/src/event/services/*.test.ts`
- `packages/backend/src/sync/**/*.test.ts`

## Core Test Style

Preferred style:

- pure function coverage
- edge cases and schema validation
- date and recurrence invariants

Useful anchors:

- `packages/core/src/util/**/*.test.ts`
- `packages/core/src/types/*.test.ts`
- `packages/core/src/validators/*.test.ts`

## E2E Notes

E2E tests live in `e2e`.

Use them for:

- critical user flows
- integration between auth, UI, and persistence
- regressions that unit tests cannot model cleanly

## Testing Realtime And Sync Changes

For SSE or sync work:

- test backend emitters/handlers where possible
- test web SSE hooks for listener registration and dispatch behavior
- test event sagas if refetch or optimistic behavior changed

## Common Gaps To Watch

- optimistic event ids
- recurring event scope handling
- local-only versus authenticated repository behavior
- storage migration paths
- date parsing around all-day events and UTC formatting

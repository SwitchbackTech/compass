# Testing Playbook

Use the smallest test surface that can fail for the change you are making, then widen only if the change crosses boundaries.

## Main Commands

From repo root:

```bash
yarn test:core
yarn test:web
yarn test:backend
yarn test:scripts
yarn type-check
```

Avoid defaulting to `yarn test` unless you really need the full suite.

## Jest Project Layout

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
yarn test:core && yarn test:web && yarn test:backend
yarn type-check
```

### Web-only UI or behavior change

Run:

```bash
yarn test:web
```

Add `yarn test:core` if the change touched shared utilities.

### Backend route or service change

Run:

```bash
yarn test:backend
```

Add `yarn test:core` if a shared type or mapper changed.

### CLI, migration, or seeder change

Run:

```bash
yarn test:scripts
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

### Route-Aware Component Tests

For components that depend on routing context (`Outlet`, nested routes, route transitions), prefer the shared memory-router helper:

- `packages/web/src/__tests__/utils/providers/MemoryRouter.tsx`

Pass `initialEntries` when asserting nested or non-root routes.

### Global And Console Cleanup

If a test overrides globals (for example `window.location` or `window.indexedDB`) or spies on `console.*`, always restore them in teardown (`afterEach`/`afterAll`) to prevent cross-test leakage and noisy output.

### Jest Unbound-Method Rule In Tests

Test linting enforces `jest/unbound-method`. If you need to assert method calls on non-mock objects, spy on the method first so assertions are bound to a Jest mock/spy.

Useful anchors:

- `packages/web/src/__tests__`
- `packages/web/src/views/**/*.test.tsx`
- `packages/web/src/socket/**/*.test.ts`

## Backend Test Style

Preferred style:

- controller/service behavior tests
- realistic request flows when possible
- mock only external services, not internal business logic

Useful anchors:

- `packages/backend/src/__tests__`
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

For websocket or sync work:

- test backend emitters/handlers where possible
- test web socket hooks for listener registration and dispatch behavior
- test event sagas if refetch or optimistic behavior changed

## Common Gaps To Watch

- optimistic event ids
- recurring event scope handling
- local-only versus authenticated repository behavior
- storage migration paths
- date parsing around all-day events and UTC formatting

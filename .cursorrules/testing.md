---
description: Testing requirements per package (web/backend/core) and best practices for writing tests with semantic queries
alwaysApply: true
---

# Testing Standards

This rule defines testing requirements and best practices for the Compass codebase.

## Before Completing Any Task

**ALWAYS run the appropriate test suite based on the package you modified:**

- Changed files in `packages/web`: Run `bun run test:web` (takes ~15 seconds)
- Changed files in `packages/backend`: Run `bun run test:backend` (takes ~15 seconds)
- Changed files in `packages/core`: Run `bun run test:core` (takes ~2 seconds)

**All tests MUST pass before marking work as complete.**

## Test File Placement

Place test files next to the code they test with `.test.ts` or `.test.tsx` extension.

**Examples:**

- `useGoogleAuth.ts` → `useGoogleAuth.test.ts`
- `compass.event.parser.ts` → `compass.event.parser.test.ts`
- `SomedaySandbox.tsx` → `SomedaySandbox.test.tsx`

## Writing Tests for `@compass/web`

Write tests the way a user would interact with the application.

### Use Semantic Queries

**DO:**

- ✅ Use `getByRole`, `getByLabelText`, `getByText`
- ✅ Use accessible names and ARIA roles
- ✅ Test user interactions with `@testing-library/user-event`

**DON'T:**

- ❌ Use `data-*` attributes or CSS selectors
- ❌ Test implementation details
- ❌ Mock excessively

**Example:**

```typescript
// Good - semantic query
const button = getByRole('button', { name: /add event/i });
await user.click(button);

// Bad - CSS selector
const button = container.querySelector('.add-button');
```

**Real examples from the codebase:**

- `packages/web/src/views/Onboarding/steps/tasks/TasksToday/TasksToday.test.tsx`
- `packages/web/src/components/DND/DNDContext.test.tsx`

### Minimize Mocking

- Avoid mocking when possible
- Use spies to sub out specific module functions before attempting to mock the whole module
- Test with real user flows and interactions

## Writing Tests for `@compass/backend` and `@compass/core`

- Follow Node.js testing best practices
- Use async/await for asynchronous tests
- Mock external services (Google Calendar API, MongoDB) appropriately
- Test error handling and edge cases
- **Do not import `mongoService` or other persistence layers directly in tests.** Use the test drivers in `packages/backend/src/__tests__/drivers/` (e.g. `UserDriver`, `WatchDriver`) so that tests stay agnostic of the backing store and switching away from Mongo later does not require test changes.

**Real examples:**

- `packages/backend/src/event/classes/compass.event.parser.test.ts`
- `packages/core/src/mappers/map.event.test.ts`

## Test Patterns

Match existing test patterns in the repository. Review similar tests before writing new ones.

Use `act` from `react`, not `react-testing-library`, to avoid warnings about updates not wrapped in `act`.
Example:

```
import { act } from "react";
```

## Summary

- Run `bun run test:web`, `bun run test:backend`, or `bun run test:core` based on changes
- Place tests next to source files with `.test.ts` extension
- Use semantic queries for web tests
- Minimize mocking, test user flows
- All tests must pass before completion

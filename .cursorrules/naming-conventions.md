# Naming Conventions

This rule defines naming standards for files and variables in the Compass codebase.

## React Hooks

Use camelCase for hook files and their tests.

**Examples:**

- ✅ Good: `useSupertokensAuth.ts` and `useSupertokensAuth.test.ts`
- ✅ Good: `useGoogleLogin.ts` and `useGoogleLogin.test.ts`
- ✅ Good: `useMainGridSelection.ts`

**Real examples from the codebase:**

- `packages/web/src/common/hooks/useGoogleAuth.ts`
- `packages/web/src/common/hooks/useIsMobile.ts`
- `packages/web/src/auth/useHasCompletedSignup.ts`

## TypeScript Files (Non-Hooks)

Use periods to separate words, not camelCase.

**Examples:**

- ✅ Good: `compass.event.parser.ts` and `compass.event.parser.test.ts`
- ✅ Good: `onboarding.storage.util.ts` and `onboarding.storage.util.test.ts`
- ✅ Good: `web.datetime.util.ts`
- ❌ Bad: `onboardingStorage.util.ts` (should use periods between words)
- ❌ Bad: `compassEventParser.ts` (should use periods)

Apply this to all file types:

- `.util.ts` - Utility files
- `.mapper.ts` - Data mappers
- `.parser.ts` - Parsers
- `.service.ts` - Service files
- `.controller.ts` - Controllers
- `.types.ts` - Type definitions

**Real examples from the codebase:**

- `packages/web/src/common/utils/datetime/web.datetime.util.ts`
- `packages/web/src/common/utils/storage/storage.util.ts`
- `packages/backend/src/event/classes/compass.event.parser.ts`
- `packages/backend/src/event/classes/gcal.event.parser.ts`
- `packages/core/src/mappers/map.event.ts`

## Boolean Variables

Always use `is` prefix for boolean variables.

**Examples:**

- ✅ Good: `isLoading`, `isError`, `isSuccess`
- ✅ Good: `isVisible`, `isDisabled`, `isActive`
- ❌ Bad: `loading`, `error`, `success`

## Barrel Files

Do NOT use barrel (`index.ts`) files for exports. Use named exports directly from source files.

**Rationale:** This improves tree-shaking and makes imports more explicit.

## Summary

- Hooks: camelCase (`useHookName.ts`)
- TypeScript files: period-separated (`feature.module.type.ts`)
- Booleans: `is` prefix (`isLoading`)
- No barrel files

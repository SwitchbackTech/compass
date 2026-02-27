# PR 5: Tests & Polish

**Branch**: `feature/auth-tests-and-polish`  
**Goal**: Add comprehensive tests for new auth flows, rename auth state for clarity, and apply optional improvements.

**Depends on**: PR 1–4 (can be done in parallel with PR 4 or after).

## Success Criteria

- New auth flows have unit and integration tests.
- Auth state naming is consistent (`hasAuthenticated` vs `isGoogleAuthenticated`).
- No regressions in existing tests.

## Changes

### 1. Rename auth state (optional but recommended)

**File**: `packages/web/src/common/constants/auth.constants.ts`

- Rename `isGoogleAuthenticated` → `hasAuthenticated` in `AuthStateSchema`.
- Default: `hasAuthenticated: false`.

**File**: `packages/web/src/common/utils/storage/auth-state.util.ts`

- `markUserAsAuthenticated()`: set `hasAuthenticated: true` (was `isGoogleAuthenticated: true`).
- `hasUserEverAuthenticated()`: return `getAuthState().hasAuthenticated`.
- Add backward compatibility: when reading old state with `isGoogleAuthenticated`, treat it as `hasAuthenticated` for one migration cycle, or require a one-time migration.

**Files that reference**:

- `packages/web/src/auth/session/SessionProvider.tsx`
- `packages/web/src/auth/context/UserProvider.tsx`
- `packages/web/src/common/repositories/event/event.repository.util.ts`
- Tests that mock `getAuthState` or `hasUserEverAuthenticated`

Update all references.

### 2. Unit tests – backend

**New/updated tests**:

- `packages/backend/src/auth/services/compass.auth.service.test.ts` (or extend existing):
  - `emailPasswordSignup` creates user without `google`, creates session.
  - `emailPasswordSignin` finds user by email, creates session.
  - `linkGoogleAccount` (if in scope) updates user with `google`, does not create new user.

- `packages/backend/src/user/services/user.service.test.ts`:
  - `hasGoogleConnected` returns true when `user.google.gRefreshToken` exists.
  - `hasGoogleConnected` returns false when `user.google` is missing or `gRefreshToken` is absent.
  - `initUserDataEmailPassword` creates user without `google`.
  - `getProfile` returns placeholder picture when `user.google` is missing.

- `packages/backend/src/event/classes/compass.event.parser.test.ts`:
  - When `hasGoogleConnected` is false, `createEvent` does not call `_createGcal`.
  - When `hasGoogleConnected` is false, `updateEvent` does not call `_updateGcal`.

### 3. Unit tests – frontend

**New/updated tests**:

- `packages/web/src/components/AuthModal/AuthModal.test.tsx`:
  - `handleSignUp` calls `AuthApi.signUpEmailPassword` with form data.
  - `handleLogin` calls `AuthApi.signInEmailPassword` with form data.
  - Success flow: marks authenticated, closes modal, triggers fetch.

- `packages/web/src/common/utils/storage/auth-state.util.test.ts`:
  - Update for `hasAuthenticated` if renamed.
  - `markUserAsAuthenticated` sets `hasAuthenticated: true`.
  - `hasUserEverAuthenticated` returns value of `hasAuthenticated`.

- `packages/web/src/common/repositories/event/event.repository.util.test.ts`:
  - Update mocks for `hasUserEverAuthenticated`; ensure repository selection works for both auth types.

### 4. Integration tests (optional)

- E2E or Cypress: sign up with email/password, create event, sign out, sign in with email/password, verify event visible. (If E2E is set up.)
- API integration: `POST /auth/signup` returns session; `GET /user/profile` with session returns profile.

### 5. Mock handlers

**File**: `packages/web/src/__tests__/__mocks__/server/mock.handlers.ts`

- Add handlers for new auth endpoints (`/auth/signup`, `/auth/signin`, `/auth/link-google`) so frontend tests can run without backend.

### 6. Documentation

**File**: `AGENTS.md` (or README)

- Document that Compass supports both Google OAuth and email/password sign-in.
- Note self-hosting: email/password works without Google OAuth credentials.

### 7. Lint and format

```bash
yarn prettier . --write
yarn lint
```

## Test Plan

1. Run full suite:

   ```bash
   yarn test:core
   yarn test:web
   yarn test:backend
   ```

2. Verify no flaky tests.

3. Manual smoke:
   - Sign up (email/pw) → create event → sign out → sign in → verify.
   - Sign in with Google → verify.
   - Session expired toast → sign in.

## Validation Commands

```bash
yarn install --frozen-lockfile --network-timeout 300000
yarn test:core
yarn test:web
yarn test:backend
yarn prettier . --write
```

## Rollback

Revert the PR. Only test and naming changes; no functional regression if reverted.

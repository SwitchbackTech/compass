# PR 2: Email/Password Auth

**Branch**: `feature/add-email-password-auth`  
**Goal**: Enable sign-up and sign-in with email and password. Wire AuthModal to the new backend.

**Depends on**: PR 1 (user schema and guards).

## Success Criteria

- Users can sign up with email, name, and password.
- Users can sign in with email and password.
- Sessions work for email/password users (profile, events, etc.).
- Google OAuth continues to work as before.
- AuthModal sign-up and login forms call the new API.
- All tests pass.

## Changes

### 1. Add Supertokens EmailPassword recipe

**File**: `packages/backend/src/common/middleware/supertokens.middleware.ts`

- Replace `ThirdParty` with `ThirdPartyEmailPassword` from `supertokens-node/recipe/thirdpartyemailpassword`.
- Configure both Google (existing) and EmailPassword.
- Keep existing `signInUp` override for Google; add overrides for `emailPasswordSignUp` and `emailPasswordSignIn` if custom logic is needed.
- Ensure Supertokens exposes the new routes (signup, signin for email/password). Refer to [ThirdPartyEmailPassword docs](https://supertokens.com/docs/thirdpartyemailpassword/introduction).

**Alternative**: Add `EmailPassword` as a separate recipe alongside `ThirdParty` if ThirdPartyEmailPassword doesn’t fit. The important part is having email/password sign-up and sign-in endpoints.

### 2. Backend: email/password sign-up flow

**File**: `packages/backend/src/auth/services/compass.auth.service.ts`

Add `emailPasswordSignup`:

1. Supertokens creates the EmailPassword user (handled by recipe).
2. Get the Supertokens user ID from the sign-up response.
3. Create Compass user in MongoDB: `email`, `firstName`, `lastName`, `name`, `locale` from request body. **No `google` field.**
4. Call `userService.initUserDataEmailPassword` (new method) to create user, default priorities, and metadata.
5. Create session via `Session.createNewSessionWithoutRequestResponse` (or use Supertokens default session creation).
6. Return session tokens to client.

**File**: `packages/backend/src/user/services/user.service.ts`

Add `initUserDataEmailPassword`:

- Accept `{ email, firstName, lastName, name?, locale? }`.
- Create user document without `google`.
- Create default priorities.
- Return the created user.

### 3. Backend: email/password sign-in flow

**File**: `packages/backend/src/auth/services/compass.auth.service.ts`

Add `emailPasswordSignin`:

1. Validate credentials via Supertokens EmailPassword recipe.
2. Look up Compass user by email.
3. Create session.
4. Return session tokens.

If the user doesn’t exist in MongoDB (legacy or edge case), create a minimal user or return an error.

### 4. Backend: auth routes

**File**: `packages/backend/src/auth/` (routes or controllers)

- Add `POST /auth/signup` (or use Supertokens FDI endpoint) for email/password sign-up.
- Add `POST /auth/signin` (or use Supertokens FDI endpoint) for email/password sign-in.

Supertokens may expose these automatically; if so, add a custom middleware/override to create the Compass user and metadata on sign-up.

### 5. Frontend: Auth API

**File**: `packages/web/src/common/apis/auth.api.ts`

Add:

```ts
async signUpEmailPassword(data: { email: string; password: string; firstName: string; lastName: string; name?: string }): Promise<Result_Auth_Compass>
async signInEmailPassword(data: { email: string; password: string }): Promise<Result_Auth_Compass>
```

These call the new backend endpoints and return session/redirect info.

### 6. Frontend: wire AuthModal

**File**: `packages/web/src/components/AuthModal/AuthModal.tsx`

- `handleSignUp`: call `AuthApi.signUpEmailPassword` with form data. On success: `markUserAsAuthenticated()`, `setAuthenticated(true)`, dispatch auth success, close modal. On error: show error.
- `handleLogin`: call `AuthApi.signInEmailPassword`. Same success/error handling.
- `handleForgotPassword`: TODO for a later PR; show a stub or disable.

### 7. Profile for users without Google

**File**: `packages/backend/src/user/services/user.service.ts`

- `getProfile` already handles optional `google` (from PR 1). Ensure `picture` fallback: use empty string or a placeholder (e.g. initials-based URL or `/avatar-placeholder.svg`).

**File**: `packages/core/src/types/user.types.ts`

- `UserProfile.picture` should allow empty string if no Google picture.

### 8. Auth state and repository selection

**File**: `packages/web/src/common/utils/storage/auth-state.util.ts`

- `markUserAsAuthenticated()`: already updates `isGoogleAuthenticated` to true. Keep as-is for now (semantic: “user has authenticated”, even if via email/pw). PR 5 can rename.
- `hasUserEverAuthenticated()`: used to decide LocalEventRepository vs RemoteEventRepository. Email/password sign-in should also call `markUserAsAuthenticated()` so repository selection is correct.

### 9. Sign-up / sign-in success flow

After successful email/password auth:

1. Call `markUserAsAuthenticated()`.
2. Call `session` SDK to store session (Supertokens frontend handles this if using their React SDK).
3. Dispatch auth success (Redux).
4. Trigger event fetch (e.g. `triggerFetch()`).
5. Optionally run `syncLocalEventsToCloud()` if the user had local events before signing up (same as Google flow).

**File**: `packages/web/src/common/utils/auth/` (create if needed)

- Add `authenticateEmailPassword` similar to `authenticate` for Google, or extend `authenticate` to accept type and data.

### 10. Session init for email/password

**File**: `packages/web/src/auth/session/SessionProvider.tsx`

- Supertokens Session recipe treats all sessions the same. No change needed if using the same session recipe for both auth methods.
- Ensure `session.doesSessionExist()` returns true after email/password sign-in.

## Test Plan

1. **Unit tests**
   - `compass.auth.service`: test `emailPasswordSignup` and `emailPasswordSignin` with mocks.
   - `user.service`: test `initUserDataEmailPassword`.
   - AuthModal: test that submit calls the correct API.

2. **Integration**
   - Sign up with email/password → session exists → profile loads → can create events.
   - Sign in with email/password → session exists → events load.
   - Sign out → session cleared.
   - Google OAuth still works.

3. **Manual**
   - Open AuthModal → Sign up with new email → verify account created, can create events.
   - Sign out → Sign in with same email/password → verify events visible.

## Validation Commands

```bash
yarn install --frozen-lockfile --network-timeout 300000
yarn test:core
yarn test:web
yarn test:backend
yarn dev:web
# Manual: sign up, sign in, create event, sign out, sign in again
```

## Rollback

Revert the PR. If users were created via email/password, they will still exist in the DB; they just won’t be able to sign in until this feature is re-enabled.

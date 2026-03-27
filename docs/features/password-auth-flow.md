# Password Auth Flow

This document explains how the email/password auth flow works

## Scope

This flow adds first-party auth on top of the existing Google OAuth setup:

- sign up with email and password
- sign in with email and password
- forgot/reset password
- email verification
- account linking so Google and password auth for the same verified email resolve to the same Compass user
- SuperTokens user-to-Compass-user mapping via Mongo `ObjectId` external ids

Primary files:

- `packages/web/src/components/AuthModal/AuthModal.tsx`
- `packages/web/src/components/AuthModal/hooks/useAuthFormHandlers.ts`
- `packages/web/src/auth/hooks/useCompleteAuthentication.ts`
- `packages/web/src/auth/session/SessionProvider.tsx`
- `packages/web/src/auth/state/auth.state.util.ts`
- `packages/backend/src/common/middleware/supertokens.middleware.ts`
- `packages/backend/src/common/middleware/supertokens.middleware.util.ts`
- `packages/backend/src/user/services/user.service.ts`
- `packages/backend/src/auth/services/google/google.auth.service.ts`

## Identity Model

Compass still treats the MongoDB `userId` as the canonical identity.

SuperTokens is configured so that:

- password sign-up ensures there is an external user id mapping, and that external id is a Mongo `ObjectId` string
- backend user upserts always write against the session user id (`response.session.getUserId()`)
- Google sign-in/up uses `google.googleId` lookup for existing Compass users before creating a new id

Important constraint: automatic account linking is currently disabled, so matching emails across Google and password auth are **not** auto-merged by middleware configuration.

## Web Entry Points

The password UI is surfaced in two ways:

- the account icon (`AccountIcon`) for unauthenticated users
- auth query params handled by `useAuthUrlParam()`

Supported URL entry points:

- `?auth=login`
- `?auth=signup`
- `?auth=forgot`
- `?auth=reset&token=...`
- `?auth=verify&token=...`

The temporary feature gate currently comes from `useAuthFeatureFlag()`:

- auth is enabled when `lastKnownEmail` exists in local auth state
- auth is also enabled when an `auth` query param is present

## Local Auth State

The web app stores a small auth state blob in localStorage:

```ts
{
  hasAuthenticated: boolean;
  lastKnownEmail?: string;
}
```

Responsibilities:

- preserve the fact that a user has authenticated before
- preserve the last known email for rollout gating after logout/session expiry
- migrate legacy `isGoogleAuthenticated` state into `hasAuthenticated`
- clear the in-memory Google-revoked fallback when auth succeeds again

Files:

- `packages/web/src/auth/state/auth.state.util.ts`
- `packages/web/src/common/constants/auth.constants.ts`

## Web Runtime Flow

### Session bootstrap

`SessionProvider.tsx` initializes SuperTokens with:

- `ThirdParty`
- `EmailPassword`
- `EmailVerification`
- `Session`

At runtime it:

- checks whether a session already exists
- marks the user as authenticated in local auth state
- reconnects the websocket when a session exists
- refreshes user metadata after session creation/refresh

`UserProvider.tsx` also backfills `lastKnownEmail` from `/api/user/profile` once a previously-authenticated user is loaded.

### Shared post-auth completion

Both Google auth and password auth finish through `useCompleteAuthentication()`.

That hook:

1. marks the user as authenticated and stores the email when available
2. flips the session context to authenticated
3. dispatches Redux auth success/import-pending state
4. refreshes user metadata
5. syncs local IndexedDB events to the server
6. triggers a fresh event fetch
7. optionally closes the modal

This keeps Google sign-in and password sign-in aligned after the backend session is created.

## Modal And Form Flow

`AuthModal.tsx` owns view switching between:

- `login`
- `signUp`
- `forgotPassword`
- `resetPassword`
- `verifyEmail`

`useAuthFormHandlers.ts` owns the actual submits.

### Sign up

`handleSignUp()` calls `EmailPassword.signUp()` with:

- `name`
- `email`
- `password`

On success it calls `completeAuthentication()` with the resolved email and closes the modal.

After the session is created, the web client immediately calls
`EmailVerification.sendVerificationEmail()`.

That keeps signup usable without blocking the first session, while still making
same-email Google linking safe once the email is verified.

### Log in

`handleLogin()` calls `EmailPassword.signIn()` with:

- `email`
- `password`

On success it also calls `completeAuthentication()`.

### Forgot password

`handleForgotPassword()` calls `EmailPassword.sendPasswordResetEmail()`.

The UI intentionally shows a generic success state so account existence is not leaked.

### Reset password

Reset starts from a link shaped like:

- `/day?auth=reset&token=...`

Important detail:

- `useAuthUrlParam()` removes `auth` from the URL after opening the modal
- `AuthModal` captures the first reset token it sees before that happens
- `handleResetPassword()` restores that token into the URL before calling `EmailPassword.submitNewPassword()`

That prevents the reset flow from breaking if the URL changes while the modal is open.

On success, the modal switches to `loginAfterReset`, which renders the login form and a success status message:

- `"Password reset successful. Log in with your new password."`

### Verify email

Verification starts from a link shaped like:

- `/day?auth=verify&token=...`

It uses the same token-preservation pattern as reset password:

- `useAuthUrlParam()` opens the modal from the query param
- `AuthModal` captures the first verification token it sees
- `handleVerifyEmail()` restores that token into the URL before calling
  `EmailVerification.verifyEmail()`

On success, the modal returns to the login view with a success state.
On invalid or expired tokens, the modal shows retry guidance instead of leaving
the user stuck on a blank or broken state.

## Backend Runtime Flow

`initSupertokens()` configures these recipes:

- `AccountLinking`
- `ThirdParty`
- `EmailPassword`
- `EmailVerification`
- `Dashboard`
- `Session`
- `UserMetadata`

### Account linking

`AccountLinking.init()` is configured to:

- decline automatic linking when the new account has no email
- automatically link verified same-email accounts when there is no active session
- allow linking without email verification when the user is already authenticated in-session

This means middleware-level automatic linking is disabled for all sign-in/up paths.

### Google sign-in/up

Google auth still enters through SuperTokens `signInUpPOST`, then:

1. `createGoogleSignInSuccess()` extracts the provider payload and session user id
2. `handleGoogleAuth()` decides between:
   - `SIGNUP`
   - `SIGNIN_INCREMENTAL`
   - `RECONNECT_REPAIR`
3. `googleAuthService` performs the matching backend path

The auth-mode decision is server-side and depends on:

- whether a Compass user already exists for the Google id
- whether a refresh token is stored
- whether sync health is good enough for incremental sync

When the user explicitly chooses "Connect Google Calendar" from an existing
password-authenticated session, the web client includes
`shouldTryLinkingWithSessionUser` in the Google sign-in payload. SuperTokens can
then link that new Google login method onto the active session user instead of
creating a second account.

### Email/password sign-up and sign-in

The `EmailPassword` recipe is overridden in two places.

Function override:

- `createNewRecipeUser()` ensures an external user id mapping exists
- the mapping value is a new Mongo `ObjectId` string when one does not already exist

API overrides:

- `signUpPOST()` extracts `email` and `name` from form fields and calls `userService.upsertUserFromAuth()`
- `signInPOST()` extracts `email` and calls `userService.upsertUserFromAuth()`

This is the step that makes the Compass user record line up with the SuperTokens session user.

### User upsert behavior

`userService.upsertUserFromAuth()`:

- validates the session user id as a Mongo `ObjectId`
- normalizes email casing and whitespace
- keeps an existing Google payload unless a new one is provided
- keeps the original `signedUpAt` on updates
- updates `lastLoggedInAt`
- creates default priorities only for a new Compass user

For repeated auth on the same session user id, this writes to the existing Compass user instead of creating a duplicate record.

## Reset Password Delivery

Current behavior in `supertokens.middleware.ts`:

- all environments rewrite the incoming SuperTokens reset link into Compass app URL shape
- all environments rewrite the incoming SuperTokens verification link into Compass app URL shape
- `test` environment logs the rewritten link and skips provider delivery
- non-test environments pass the rewritten link to SuperTokens' original email sender (`originalImplementation.sendEmail`)
- if the incoming link has no `token` query param, backend keeps the original link unchanged

The rewritten link shape comes from `buildResetPasswordLink()` and
`buildEmailVerificationLink()`.

The host/origin portion is taken from backend env (`FRONTEND_URL`), and the
route is always `/day`.

- Reset: `http://localhost:9080/day?auth=reset&token=...`
- Verify: `http://localhost:9080/day?auth=verify&token=...`

## Event And Sync Behavior After Password Auth

Password-only users can now mutate Compass events without a Google connection at the route layer.

Relevant changes:

- `event.routes.config.ts` no longer requires route-level Google connection middleware for create/update/delete
- `CompassSyncProcessor` applies the Compass mutation first
- if the Google side effect fails only because the user has no Google refresh token, the processor keeps the Compass mutation and skips the Google effect

That lets password-auth users use Compass without blocking on Google connectivity.

When a password-only user later connects Google:

- `googleSignup()` first attaches Google credentials to the existing Compass user
- `syncCompassEventsToGoogle()` backfills eligible Compass-only events that do
  not yet have Google ids
- background Google sync is then restarted as normal

This prevents the "connect Google later" path from leaving pre-existing Compass
events stranded outside Google Calendar.

## Known Caveats

- The rollout gate is not limited to `lastKnownEmail`; any `?auth=` URL currently enables the auth UI.
- Reset password links always target the `/day` route and require a valid `FRONTEND_URL` in backend env.
- With automatic account linking disabled, same-email Google and email/password identities are not merged automatically.

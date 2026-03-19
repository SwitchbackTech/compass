# Password Auth Flow

This branch adds email/password auth on top of the existing Google auth flow.

The short version:

- SuperTokens owns credentials, password reset tokens, account linking, and session cookies.
- Compass owns the canonical Mongo user record, user metadata, and post-auth app behavior.
- The bridge between them is `userService.upsertUserFromAuth(...)`, which makes sure the SuperTokens session user maps onto the right Compass user.

Primary files:

- `packages/backend/src/common/middleware/supertokens.middleware.ts`
- `packages/backend/src/common/middleware/supertokens.middleware.util.ts`
- `packages/backend/src/user/services/user.service.ts`
- `packages/web/src/components/AuthModal/hooks/useAuthFormHandlers.ts`
- `packages/web/src/auth/hooks/useCompleteAuthentication.ts`
- `packages/web/src/auth/session/SessionProvider.tsx`
- `packages/web/src/auth/state/auth.state.util.ts`

## What SuperTokens Owns

SuperTokens is configured in `initSupertokens()` with:

- `ThirdParty`
- `EmailPassword`
- `AccountLinking`
- `Session`
- `UserMetadata`
- `Dashboard`

For email/password specifically, SuperTokens handles:

- sign up validation and password storage
- sign in credential checks
- session creation and refresh
- password reset token generation and validation
- same-email account linking when the email can be safely linked

Compass does not store raw passwords or implement password checking itself.

## What Compass Owns

Compass still treats the MongoDB `userId` as the canonical identity.

After SuperTokens signs a user up or signs them in, Compass:

- upserts the Mongo user through `userService.upsertUserFromAuth(...)`
- normalizes email casing/whitespace
- preserves existing Google data when present
- creates default priorities for a brand new Compass user
- refreshes user metadata
- syncs local events into the cloud after auth succeeds

That is how Google auth and password auth both land on the same Compass user/data.

## End-To-End Flow

### Web entry

The auth modal opens from:

- the unauthenticated account icon
- auth query params such as `?auth=login`, `?auth=signup`, `?auth=forgot`, and `?auth=reset&token=...`

The web form handlers live in `useAuthFormHandlers.ts`.

### Sign up

1. The modal calls `EmailPassword.signUp(...)`.
2. SuperTokens creates the auth user.
3. The backend `signUpPOST()` override extracts `email` and `name`.
4. Compass calls `userService.upsertUserFromAuth(...)`.
5. The web app finishes through `useCompleteAuthentication()`.

### Sign in

1. The modal calls `EmailPassword.signIn(...)`.
2. SuperTokens validates the password and creates the session.
3. The backend `signInPOST()` override extracts `email`.
4. Compass calls `userService.upsertUserFromAuth(...)`.
5. The web app finishes through `useCompleteAuthentication()`.

### Reset password

1. The modal calls `EmailPassword.sendPasswordResetEmail(...)`.
2. SuperTokens generates the reset token and reset link.
3. Compass rewrites that link into the app flow.
4. The reset screen later calls `EmailPassword.submitNewPassword(...)`.

Important detail:

- the modal captures the first reset token it sees from the URL
- it restores that token before calling `submitNewPassword()`
- this keeps reset working even after the modal strips `auth` from the URL

## Account Linking

`AccountLinking.init()` is set to:

- refuse automatic linking when there is no email
- allow automatic linking when there is an email
- require verification before linking

For password users, Compass also ensures there is an external SuperTokens user-id mapping whose value is a Mongo `ObjectId` string. That is what lets the session user id line up with the Compass user id cleanly.

## What You Can See

There is some visibility, but most of it is backend- or data-level rather than in the Compass UI.

You can inspect:

- the canonical Compass user in Mongo
- the SuperTokens-to-Compass id mapping created in `supertokens.middleware.util.ts`
- the current Compass session behavior through routes guarded by `verifySession()`
- the user profile and metadata returned by `/api/user/profile` and `/api/user/metadata`
- password reset requests in backend logs during local dev/test

You do not currently have:

- a Compass admin page for password users
- a Compass screen showing SuperTokens login methods or verification state
- real operator tooling in the app for browsing SuperTokens records

`Dashboard.init()` is enabled, so SuperTokens dashboard support is configured, but Compass does not add its own UI around it.

## Local Auth State

# The web app also keeps a small local auth-state record:

- `packages/backend/src/common/middleware/supertokens.middleware.ts`
- `packages/backend/src/common/middleware/supertokens.middleware.util.ts`
- `packages/backend/src/user/services/user.service.ts`
- `packages/backend/src/auth/services/google/google.auth.service.ts`

## Identity Model

Compass still treats the MongoDB `userId` as the canonical identity.

SuperTokens is configured so that:

- Google auth and email/password auth both create or attach to the same primary user when the email can be linked
- password sign-up ensures there is an external user id mapping, and that external id is a Mongo `ObjectId` string
- backend user upserts always write against that canonical Compass user id

The key consequence is that auth method changes should not fork a user into multiple Compass records.

## Web Entry Points

The password UI is surfaced in two ways:

- the account icon (`AccountIcon`) for unauthenticated users
- auth query params handled by `useAuthUrlParam()`

Supported URL entry points:

- `?auth=login`
- `?auth=signup`
- `?auth=forgot`
- `?auth=reset&token=...`

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

This is not the source of truth for credentials. It is only used for app behavior such as:

- remembering that the user has authenticated before
- preserving the last known email for rollout gating
- helping the app choose post-auth behavior after session changes

## Current Caveats

- Any `?auth=` URL currently enables the auth UI, so the temporary rollout gate is not limited to `lastKnownEmail`.
- Reset password emails are only logged in local dev/test right now; they are not actually delivered elsewhere on this branch.
- # The reset-link rewrite is currently hardcoded to `http://localhost:9080/day?auth=reset&token=...`.

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

`useAuthFormHandlers.ts` owns the actual submits.

### Sign up

`handleSignUp()` calls `EmailPassword.signUp()` with:

- `name`
- `email`
- `password`

On success it calls `completeAuthentication()` with the resolved email and closes the modal.

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

On success, the modal returns to the login view.

## Backend Runtime Flow

`initSupertokens()` configures these recipes:

- `AccountLinking`
- `ThirdParty`
- `EmailPassword`
- `Dashboard`
- `Session`
- `UserMetadata`

### Account linking

`AccountLinking.init()` is configured to:

- decline automatic linking when the new account has no email
- automatically link when an email exists
- require verification before linking

That means same-email Google and password accounts should collapse onto one canonical Compass user once SuperTokens has enough verified identity information to link safely.

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

For a linked account, this writes to the existing Compass user instead of creating a duplicate record.

## Reset Password Delivery

Password reset emails are not sent by a real mail provider in this branch.

Current behavior in `supertokens.middleware.ts`:

- in `test` and local dev, the reset link is rewritten into the app flow and logged
- in other environments, the request is logged but email delivery is explicitly disabled

The rewritten link shape comes from `buildResetPasswordLink()` and currently points to:

- `http://localhost:9080/day?auth=reset&token=...`

## Event And Sync Behavior After Password Auth

Password-only users can now mutate Compass events without a Google connection at the route layer.

Relevant changes:

- `event.routes.config.ts` no longer requires route-level Google connection middleware for create/update/delete
- `CompassSyncProcessor` applies the Compass mutation first
- if the Google side effect fails only because the user has no Google refresh token, the processor keeps the Compass mutation and skips the Google effect

That lets password-auth users use Compass without blocking on Google connectivity.

## Known Caveats On This Branch

- The rollout gate is not limited to `lastKnownEmail`; any `?auth=` URL currently enables the auth UI.
- Reset password delivery is still dev/test-oriented because links are logged in dev and not actually sent elsewhere.
- `buildResetPasswordLink()` currently hardcodes the local web origin and `/day` route when rewriting reset URLs.

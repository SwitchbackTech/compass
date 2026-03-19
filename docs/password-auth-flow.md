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

The web app also keeps a small local auth-state record:

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
- The reset-link rewrite is currently hardcoded to `http://localhost:9080/day?auth=reset&token=...`.

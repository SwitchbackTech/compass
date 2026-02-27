# PR 4: Connect Google (Account Linking)

**Branch**: `feature/connect-google-account-linking`  
**Goal**: Allow users who signed up with email/password to connect their Google account. Link Google identity to the existing Compass user. Sync Compass-only events to Google when connecting.

**Depends on**: PR 1, PR 2.

## Success Criteria

- Signed-in email/password user can click "Connect Google Calendar" and complete OAuth.
- Google identity is linked to the existing user (no new user created).
- User can sign in from another device with either email/password or Google and see the same data.
- Compass-only events (no `gEventId`) are pushed to Google when connecting; `gEventId` is set.
- All tests pass.

## Changes

### 1. Supertokens account linking

**File**: `packages/backend/src/common/middleware/supertokens.middleware.ts`

- Enable account linking for ThirdPartyEmailPassword (or equivalent).
- Configure `shouldDoAutomaticAccountLinking`: when a user has a valid session and completes Google OAuth, link the Google identity to that session’s user instead of creating a new one.
- Ensure the backend receives a signal that this is a "link" flow vs "sign up/sign in" (e.g. session exists when OAuth callback is processed).

### 2. "Connect Google" flow – frontend

**File**: `packages/web/src/auth/hooks/oauth/useConnectGoogle.ts` (or new hook)

- When user is signed in with email/password and clicks "Connect Google Calendar":
  - Call Google OAuth with `prompt: 'consent'` to ensure refresh token is returned.
  - Send OAuth code to backend with a flag like `?link=true` or `linkGoogleAccount=true`.
- Backend route distinguishes:
  - No session + OAuth → normal sign-in/sign-up (existing flow).
  - Session exists + OAuth + `link=true` → link flow.

**File**: `packages/web/src/auth/hooks/oauth/useGoogleAuth.ts`

- Add optional parameter: `linkAccount?: boolean`. When true, call a different backend endpoint (e.g. `POST /auth/link-google`) instead of `/signinup`.

### 3. Backend: link Google to existing user

**File**: `packages/backend/src/auth/services/compass.auth.service.ts`

Add `linkGoogleAccount`:

1. Require valid session (user is signed in).
2. Get `userId` from session.
3. Receive Google OAuth result (tokens, user info).
4. Update MongoDB user: `$set: { google: { googleId, picture, gRefreshToken } }`.
5. Link ThirdParty (Google) to the Supertokens user via account linking API.
6. Run `syncCompassOnlyEventsToGoogle(userId)` (see step 5).
7. Run `userService.startGoogleCalendarSync(userId)` to import Google calendars and start watches.
8. Return success.

**File**: `packages/backend/src/auth/` (routes)

- Add `POST /auth/link-google` (or similar). Accept OAuth code, validate session, call `linkGoogleAccount`.

### 4. Google sign-in for already-linked users

**File**: `packages/backend/src/auth/services/compass.auth.service.ts`

- In the existing `signInUp` override (Google OAuth callback):
  - If `response.createdNewRecipeUser` is false (user already exists in Supertokens), it may be a linked user signing in with Google. Ensure we look up Compass user by `google.googleId`.
  - If found, proceed with `googleSignin` (update token, incremental sync).
  - No new Compass user creation when the Google identity is already linked.

### 5. Sync Compass-only events to Google

**File**: `packages/backend/src/event/services/event.service.ts` or new util

Add `syncCompassOnlyEventsToGoogle(userId: string)`:

1. Query events: `{ user: userId, isSomeday: false, $or: [{ gEventId: { $exists: false } }, { gEventId: null }] }`.
2. For each event (and its instances if recurring), call `_createGcal(userId, event)`.
3. Update the event in MongoDB with the returned `gEventId` (and `gRecurringEventId` for instances).
4. Run after linking Google, before or after `startGoogleCalendarSync`.

**File**: `packages/backend/src/auth/services/compass.auth.service.ts`

- In `linkGoogleAccount`: call `syncCompassOnlyEventsToGoogle(userId)` before `startGoogleCalendarSync`.

### 6. UI: "Connect Google Calendar" when user has no Google

**File**: `packages/web/src/auth/hooks/oauth/useConnectGoogle.ts`

- `isGoogleCalendarConnected`: today this equals `authenticated`. Change to:
  - `authenticated && hasGoogleConnected`, where `hasGoogleConnected` comes from profile or a new `/user/profile` field.
- When `authenticated && !hasGoogleConnected`, show "Connect Google Calendar" which triggers the link flow (not full login).

**File**: `packages/backend/src/user/controllers/user.controller.ts` and `user.service.ts`

- Extend `getProfile` to include `hasGoogleConnected: boolean` (or derive on frontend from `picture` or a new field). Simplest: add `hasGoogleConnected: !!user?.google?.gRefreshToken` to the profile response.

### 7. Update `manuallyCreateOrUpdateUser` for link flow

**File**: `packages/backend/src/common/middleware/supertokens.middleware.ts`

- When processing Google OAuth in a "link" context, `manuallyCreateOrUpdateUser` may be called. Ensure it finds the existing Compass user by session’s userId, not by `google.googleId`, when in link mode. This depends on how Supertokens invokes the override during linking.

### 8. Edge cases

- **User connects Google with same email as Compass account**: No conflict; we’re linking.
- **User connects Google with different email** (e.g. user1@yahoo.com Compass, user1@gmail.com Google): Allow it. We link by Compass userId from session.
- **User already has Google linked, clicks Connect again**: Idempotent; refresh token is updated.

## Test Plan

1. **Unit**
   - `linkGoogleAccount`: mock user, Google tokens; assert user updated, `syncCompassOnlyEventsToGoogle` called.
   - `syncCompassOnlyEventsToGoogle`: mock events without `gEventId`; assert `_createGcal` called, events updated.

2. **Integration**
   - Sign up with email/password → create events (no Google) → connect Google → verify events appear in Google Calendar with `gEventId` set.
   - Sign out → sign in with Google (same linked account) → verify same events.
   - Sign out → sign in with email/password → verify same events.

3. **Manual**
   - Full flow: sign up (email/pw) → create 2–3 events → connect Google → check Google Calendar → sign out → sign in with Google on another browser → verify events.

## Validation Commands

```bash
yarn test:core
yarn test:web
yarn test:backend
yarn dev:web
# Manual: sign up email/pw → create events → connect Google → verify
```

## Rollback

Revert the PR. Linked users will still have `google` set in MongoDB; they can continue signing in with Google. The "Connect" UI and link endpoint will be removed.

# PR 1: User Schema & GCal Guards

**Branch**: `feature/add-user-schema-guards`  
**Goal**: Make the user model and event/sync logic tolerant of users without Google. No new auth flows; no behavior change for existing Google users.

## Success Criteria

- All existing tests pass.
- Google users continue to work exactly as before.
- Code paths that call `getGcalClient` or touch `user.google` safely handle users without Google.
- No user-facing changes.

## Changes

### 1. User schema – make `google` optional

**File**: `packages/core/src/types/user.types.ts`

- Change `google: { ... }` to `google?: { ... }` in `Schema_User`.
- Update `UserProfile` to handle optional `picture`: use `picture?: string` or derive from `google?.picture` with fallback.

```ts
// Before
google: {
  googleId: string;
  picture: string;
  gRefreshToken: string;
};

// After
google?: {
  googleId: string;
  picture: string;
  gRefreshToken: string;
};
```

### 2. Add `UserError.GoogleNotConnected` and type guard

**File**: `packages/backend/src/common/errors/user/user.errors.ts`

- Add `GoogleNotConnected` to the interface and export:

```ts
GoogleNotConnected: {
  description: "User has not connected Google Calendar",
  status: Status.BAD_REQUEST,
  isOperational: true,
},
```

- Add type guard (in same file or `packages/backend/src/common/errors/user/user.error.utils.ts`):

```ts
export const isGoogleNotConnectedError = (e: unknown): e is BaseError =>
  e instanceof BaseError &&
  e.description === UserError.GoogleNotConnected.description;
```

### 3. Update `getGcalClient` and `getGAuthClientForUser` for users without Google

**File**: `packages/backend/src/auth/services/google.auth.service.ts`

- In `getGcalClient`: after fetching user, if `!user?.google?.gRefreshToken`, throw `error(UserError.GoogleNotConnected, "User has not connected Google Calendar")` (not the generic GaxiosError). Keep existing behavior when user is not found (still throw `GaxiosError` for session invalidation).
- In `getGAuthClientForUser`: fix `_user.google.gRefreshToken` access (line 45) to handle optional `google` when refetching by userId — throw `error(UserError.GoogleNotConnected, "User has not connected Google Calendar")` if `!_user?.google?.gRefreshToken` instead of accessing undefined.

Centralizing in `getGcalClient` means one DB fetch and one place to check; no separate `hasGoogleConnected` helper.

### 4. Event service – catch and handle `GoogleNotConnected`

**File**: `packages/backend/src/event/services/event.service.ts`

- In `_getGcal`, `_createGcal`, `_updateGcal`, `_deleteGcal`: wrap `getGcalClient` in try/catch; if `isGoogleNotConnectedError(e)`, return `null` (create/update/get) or no-op (delete). Re-throw other errors.
- Update return types where needed (`GEvent | null` for create/update/get).

### 5. Parser – treat `null` as Compass-only success

**File**: `packages/backend/src/event/classes/compass.event.parser.ts`

- In `createEvent`, `updateEvent`, `updateSeries`, `deleteEvent`, `deleteSeries`: when the event-service GCal method returns `null` (no Google), return `[operationSummary]` — the Compass operation succeeded, GCal was skipped.

### 6. Other `getGcalClient` call sites – catch and handle

| File                                                              | Context                                       | Action when `isGoogleNotConnectedError`                                                            |
| ----------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/backend/src/user/services/user.service.ts`              | `startGoogleCalendarSync`                     | Catch; return `{ eventsCount: 0, calendarsCount: 0 }`                                              |
| `packages/backend/src/user/services/user.service.ts`              | `restartGoogleCalendarSync`                   | Catch; return early / no-op                                                                        |
| `packages/backend/src/sync/services/sync.service.ts`              | `handleGCalNotification`, `importIncremental` | Catch; log and return / skip                                                                       |
| `packages/backend/src/sync/services/import/sync.import.ts`        | `createSyncImport`                            | When `id` is string, catch and re-throw or return no-op import                                     |
| `packages/backend/src/sync/services/maintain/sync.maintenance.ts` | `prune`, `refreshWatch`                       | Catch; skip user / early return                                                                    |
| `packages/backend/src/sync/controllers/sync.debug.controller.ts`  | Debug endpoint                                | Let error propagate — Express handler returns 400 via `UserError.GoogleNotConnected`               |
| `packages/backend/src/calendar/services/calendar.service.ts`      | Calendar init                                 | Only used after Google OAuth; add catch if called from a path that could run for non-Google users. |

Express error handler already maps `BaseError` to `res.status(e.statusCode).send(e)`; no change needed.

Test files and migration scripts can continue to use users with Google; no changes required unless they assert on error behavior.

### 7. Update user profile / getProfile for optional `google`

**File**: `packages/backend/src/user/services/user.service.ts`

- In `getProfile`: `picture` comes from `user.google.picture`. Change to `user.google?.picture ?? ""` or a placeholder (e.g. empty string, or a default avatar URL).
- Ensure projection includes `google.picture` when present.

### 8. Update `map.user.ts` usage

**File**: `packages/core/src/mappers/map.user.ts`

- `mapUserToCompass` is only used for Google users; no change.
- Any other mapper that assumes `user.google` must use optional chaining.

## Test Plan

1. **Unit tests**

   ```bash
   yarn test:core
   yarn test:backend
   yarn test:web
   ```

2. **Regression**:
   - Create a test user with Google (use existing fixtures).
   - Create/update/delete events; verify GCal sync still works.
   - Run sync import; verify no errors.

3. **New behavior** (mock or create a user without `google`):
   - `getGcalClient` throws `UserError.GoogleNotConnected` for user without `google`.
   - Event create/update/delete for that user does not call GCal; events are stored in MongoDB only.

## Validation Commands

```bash
yarn install --frozen-lockfile --network-timeout 300000
yarn test:core
yarn test:web
yarn test:backend
yarn prettier . --write
```

## Rollback

Revert the PR. All changes are additive (optional fields, guards). No migrations.

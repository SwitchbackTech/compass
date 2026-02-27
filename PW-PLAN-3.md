# PR 3: Session Expired Toast

**Branch**: `feature/update-session-expired-toast`  
**Goal**: Replace Google-specific "reconnect" message with a generic "Session expired" toast that opens AuthModal (supports both email/password and Google).

**Depends on**: PR 2 recommended (so both email/password and Google work in AuthModal). Can merge before PR 2—toast would open AuthModal, but only Google sign-in would work until PR 2.

## Success Criteria

- On 401, toast shows "Session expired. Please sign in again."
- Button label: "Sign in" (not "Reconnect Google Calendar").
- Clicking the button opens AuthModal on the login view.
- User can sign in with email/password or Google.
- All tests pass.

## Changes

### 1. Update SessionExpiredToast component

**File**: `packages/web/src/common/utils/toast/session-expired.toast.tsx`

**Before**:

- Message: "Google Calendar connection expired. Please reconnect."
- Button: "Reconnect Google Calendar" → calls `useGoogleAuth().login()`.

**After**:

- Message: "Session expired. Please sign in again."
- Button: "Sign in" → calls `useAuthModal().openModal("login")`, then `toast.dismiss(toastId)`.

**Implementation**:

```tsx
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

export const SessionExpiredToast = ({ toastId }: SessionExpiredToastProps) => {
  const { openModal } = useAuthModal();

  const handleSignIn = () => {
    openModal("login");
    toast.dismiss(toastId);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-white">
        Session expired. Please sign in again.
      </p>
      <button className="..." onClick={handleSignIn} type="button">
        Sign in
      </button>
    </div>
  );
};
```

- Remove `useGoogleAuth` import.
- `SessionExpiredToast` must be rendered within `AuthModalProvider` to use `useAuthModal`. See step 2.

### 2. Ensure SessionExpiredToast has access to AuthModalProvider

**File**: `packages/web/src/components/CompassProvider/CompassProvider.tsx`

Currently `ToastContainer` is a sibling of `AuthModalProvider`, so toast content may not be inside the provider tree (depending on where react-toastify portals render).

**Option A** (preferred): Move `ToastContainer` inside `AuthModalProvider` so toast children have context access.

```tsx
<AuthModalProvider>
  {props.children}
  <AuthModal />
  <ToastContainer ... />
</AuthModalProvider>
```

**Option B**: Wrap the entire subtree (including ToastContainer) in a provider that’s guaranteed to contain the toast portal. Some toast libraries render into `document.body`; in that case, the component that renders the toast content is still a React child of the provider that mounted it. Verify react-toastify behavior.

After the change, `SessionExpiredToast` should be able to call `useAuthModal()` without error.

### 3. Update tests

**File**: `packages/web/src/common/utils/toast/session-expired.toast.test.tsx`

- Update expectations:
  - Message: "Session expired. Please sign in again."
  - Button: "Sign in" (or getByRole("button", { name: /sign in/i })).
  - Mock `useAuthModal` instead of `useGoogleAuth`.
  - Assert `openModal("login")` is called on button click.
  - Assert `toast.dismiss` is called.

**File**: `packages/web/src/common/utils/toast/error-toast.util.ts`

- No changes; `showSessionExpiredToast` already renders `SessionExpiredToast`.

### 4. Ensure 401 flow still triggers the toast

**Files**:

- `packages/web/src/common/apis/compass.api.ts` – interceptor calls `showSessionExpiredToast()` on 401.
- `packages/web/src/auth/context/UserProvider.tsx` – `getProfile` catch calls `showSessionExpiredToast()` on 401.

No changes needed; they already show the toast. The toast content is what changed.

## Test Plan

1. **Unit**

   ```bash
   yarn test:web
   ```

   - `session-expired.toast.test.tsx` passes with new assertions.

2. **Manual**
   - Sign in (Google or email/password).
   - Expire or revoke session (e.g. clear cookies, wait, or use devtools).
   - Trigger a 401 (e.g. navigate to a protected route or refresh).
   - Verify toast appears with new message and "Sign in" button.
   - Click "Sign in" → AuthModal opens on login view.
   - Sign in with either method → modal closes, session restored.

## Validation Commands

```bash
yarn test:web
yarn dev:web
# Manual: trigger 401, verify toast and AuthModal behavior
```

## Rollback

Revert the PR. Toast reverts to Google-only "Reconnect Google Calendar" behavior.

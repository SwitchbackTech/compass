import { type PropsWithChildren, useCallback, useState } from "react";
import { UserApi } from "@web/api/user.api";
import { getLastKnownEmail } from "@web/auth/compass/state/auth.state.util";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { clearAllBrowserStorage } from "@web/common/utils/cleanup/browser.cleanup.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { DeleteAccountConfirmationDialog } from "@web/components/DeleteAccountConfirmation/DeleteAccountConfirmationDialog";
import {
  DeleteAccountConfirmationContext,
  useDeleteAccountConfirmationState,
} from "@web/components/DeleteAccountConfirmation/hooks/useDeleteAccountConfirmation";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";

/** How long the farewell stays up, counted from when it appears. */
const FAREWELL_MS = 3000;

export function DeleteAccountConfirmationProvider({
  children,
}: PropsWithChildren) {
  const value = useDeleteAccountConfirmationState();
  const { closeDeleteAccountConfirmation, isOpen } = value;
  const [farewell, setFarewell] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    closeDeleteAccountConfirmation();

    // Up before the request, not after it: deleting spans a Mongo
    // transaction and a Google grant revocation, and until this covers the
    // screen the user is looking at the calendar of the account they just
    // deleted, with nothing to say it's working. Reading the email has to
    // happen first too, since the cleanup below wipes it from storage.
    setFarewell(getLastKnownEmail() ?? "friend");
    // Monotonic: a wall clock that steps backwards mid-delete (NTP, resume
    // from sleep) would make the wait below longer than the step.
    const shownAt = performance.now();

    void (async () => {
      try {
        await UserApi.deleteAccount();
      } catch (e) {
        console.error("Failed to delete account", e);
        setFarewell(null);
        showErrorToast("Couldn't delete your account. Please try again.");
        return;
      }

      try {
        await clearAllBrowserStorage();
      } catch {
        // Already logged by clearAllBrowserStorage. The account is gone
        // either way, so still send them off as an anonymous user.
      }

      // Hold the farewell for its full span measured from when it appeared,
      // so a slow delete doesn't add to the wait and a fast one doesn't
      // flash it.
      const remaining = FAREWELL_MS - (performance.now() - shownAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      // Reload rather than just flipping session state: it's the only way to
      // be sure nothing of the deleted account survives in memory (query
      // caches, the open IndexedDB connection). They land back in the app,
      // anonymous.
      window.location.assign(ROOT_ROUTES.ROOT);
    })();
  }, [closeDeleteAccountConfirmation]);

  return (
    <DeleteAccountConfirmationContext.Provider value={value}>
      {children}
      <DeleteAccountConfirmationDialog
        isOpen={isOpen}
        onCancel={closeDeleteAccountConfirmation}
        onConfirm={handleConfirm}
      />
      {farewell && (
        <OverlayPanel
          role="status"
          variant="status"
          message={`Until our sails cross paths again, so long ${farewell}.`}
        />
      )}
    </DeleteAccountConfirmationContext.Provider>
  );
}

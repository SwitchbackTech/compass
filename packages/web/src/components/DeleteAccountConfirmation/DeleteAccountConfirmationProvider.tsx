import { type PropsWithChildren, useCallback, useState } from "react";
import { UserApi } from "@web/api/user.api";
import { getLastKnownEmail } from "@web/auth/compass/state/auth.state.util";
import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { clearAllBrowserStorage } from "@web/common/utils/cleanup/browser.cleanup.util";
import { DeleteAccountConfirmationDialog } from "@web/components/DeleteAccountConfirmation/DeleteAccountConfirmationDialog";
import { DeleteAccountFailureDialog } from "@web/components/DeleteAccountConfirmation/DeleteAccountFailureDialog";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const deleteAccount = useCallback(async () => {
    setHasFailed(false);
    setFarewell(null);
    setIsDeleting(true);

    try {
      await UserApi.deleteAccount();
    } catch (e) {
      console.error("Failed to delete account", e);
      setIsDeleting(false);
      setHasFailed(true);
      return;
    }

    const email = getLastKnownEmail() ?? "friend";

    try {
      await clearAllBrowserStorage();
    } catch {
      // Already logged by clearAllBrowserStorage. The account is gone
      // either way, so still send them off as an anonymous user.
    } finally {
      // Match deliberate logout: do not let a later anonymous visitor or
      // newly-created account inherit this deleted account's device identity.
      getPosthogClient()?.reset();
    }

    setIsDeleting(false);
    setFarewell(email);

    await new Promise((resolve) => setTimeout(resolve, FAREWELL_MS));
    window.location.assign(ROOT_ROUTES.ROOT);
  }, []);

  const handleConfirm = useCallback(() => {
    closeDeleteAccountConfirmation();
    void deleteAccount();
  }, [closeDeleteAccountConfirmation, deleteAccount]);

  const handleFailureCancel = useCallback(() => {
    setHasFailed(false);
  }, []);

  return (
    <DeleteAccountConfirmationContext.Provider value={value}>
      {children}
      <DeleteAccountConfirmationDialog
        isOpen={isOpen}
        onCancel={closeDeleteAccountConfirmation}
        onConfirm={handleConfirm}
      />
      <DeleteAccountFailureDialog
        isOpen={hasFailed}
        onCancel={handleFailureCancel}
        onRetry={deleteAccount}
      />
      {isDeleting && (
        <OverlayPanel
          role="status"
          variant="status"
          message="Deleting your account."
        />
      )}
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

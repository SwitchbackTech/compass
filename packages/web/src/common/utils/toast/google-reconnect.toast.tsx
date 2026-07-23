import { createElement } from "react";
import { type Id } from "react-toastify";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";

// Imported dynamically to avoid a module cycle: google.auth.util shows this
// toast, and the reconnect flow needs google.auth.util's local-event flush.
const flushPendingLocalEvents = async (): Promise<boolean> => {
  const { syncPendingLocalEvents } = await import(
    "@web/auth/google/util/google.auth.util"
  );
  return syncPendingLocalEvents();
};

interface GoogleReconnectToastProps {
  toastId: Id;
  syncPendingLocalEvents?: () => Promise<boolean>;
}

// Shown when Google reports invalid_grant, which covers both "access expired"
// and "user revoked access" with no way to tell them apart, so the copy must
// stay accurate for either cause. Hooks are fine here: ToastContainer renders
// inside GoogleOAuthProvider (CompassProvider).
export const GoogleReconnectToast = ({
  toastId,
  syncPendingLocalEvents = flushPendingLocalEvents,
}: GoogleReconnectToastProps) => {
  const { startGoogleAuthorization } = useStartGoogleAuthorization({
    intent: "connectCalendar",
    prompt: "consent",
  });

  const handleReconnect = async () => {
    const didSyncLocalEvents = await syncPendingLocalEvents();

    // The flush already showed its own error toast; keep this one around so
    // the user can retry once the flush issue is resolved.
    if (!didSyncLocalEvents) {
      return;
    }

    getToast().dismiss(toastId);
    void startGoogleAuthorization();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="font-medium text-sm text-text">
        Google Calendar disconnected
      </p>
      <p className="text-sm text-text">
        This happens when access expires or is revoked. Your events are still
        safe in Google. Reconnect and Compass will re-import them.
      </p>
      <button
        className="w-full rounded bg-accent-secondary px-3 py-2 font-medium text-on-accent text-sm transition-colors hover:bg-accent-secondary-hover"
        onClick={() => void handleReconnect()}
        type="button"
      >
        Reconnect Google Calendar
      </button>
    </div>
  );
};

export function showGoogleReconnectToast(): Id {
  return showErrorToast(
    createElement(GoogleReconnectToast, { toastId: GOOGLE_REVOKED_TOAST_ID }),
    {
      toastId: GOOGLE_REVOKED_TOAST_ID,
      severity: ErrorToastSeverity.CRITICAL,
    },
  );
}

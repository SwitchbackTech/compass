import { createElement } from "react";
import { type Id, toast } from "react-toastify";
import { useStartGoogleAuthorization } from "@web/auth/google/authorization/useStartGoogleAuthorization";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";

interface GoogleReconnectToastProps {
  toastId: Id;
}

// Shown when Google reports invalid_grant, which covers both "access expired"
// and "user revoked access" with no way to tell them apart, so the copy must
// stay accurate for either cause.
export const GoogleReconnectToast = ({
  toastId,
}: GoogleReconnectToastProps) => {
  // Legal here: ToastContainer renders inside GoogleOAuthProvider
  // (CompassProvider), so the OAuth context is available.
  const { startGoogleAuthorization } = useStartGoogleAuthorization({
    intent: "connectCalendar",
    prompt: "consent",
  });

  const handleReconnect = async () => {
    // Imported dynamically to avoid a module cycle: google.auth.util shows
    // this toast, and this handler needs google.auth.util's local-event flush.
    const { syncPendingLocalEvents } = await import(
      "@web/auth/google/util/google.auth.util"
    );
    const didSyncLocalEvents = await syncPendingLocalEvents();

    // The flush already showed its own error toast; keep this one around so
    // the user can retry once the flush issue is resolved.
    if (!didSyncLocalEvents) {
      return;
    }

    toast.dismiss(toastId);
    void startGoogleAuthorization();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="font-medium text-sm text-text-lighter">
        Google Calendar disconnected
      </p>
      <p className="text-sm text-text-lighter">
        This happens when access expires or is revoked. Your events are still
        safe in Google. Reconnect and Compass will re-import them.
      </p>
      <button
        className="w-full rounded bg-fg-primary-dark px-3 py-2 font-medium text-sm text-text-lighter transition-colors hover:bg-[color-mix(in_srgb,var(--color-fg-primary-dark)_90%,white)]"
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

// At most once per page load, so a dismissal isn't nagged mid-session but the
// reminder returns on the next load until the user reconnects.
let hasShownOnLoad = false;

export function showGoogleReconnectToastOnLoad(): boolean {
  if (hasShownOnLoad) {
    return false;
  }

  hasShownOnLoad = true;
  showGoogleReconnectToast();
  return true;
}

export function resetGoogleReconnectToastOnLoadForTests(): void {
  hasShownOnLoad = false;
}

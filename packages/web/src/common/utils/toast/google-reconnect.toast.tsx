import { createElement } from "react";
import { type Id } from "react-toastify";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";

interface GoogleReconnectToastProps {
  toastId: Id;
}

// Shown when Google reports invalid_grant, which covers both "access expired"
// and "user revoked access" with no way to tell them apart, so the copy must
// stay accurate for either cause. Hooks are fine here: ToastContainer renders
// inside GoogleOAuthProvider (CompassProvider).
//
// Delegates to useConnectGoogle's connect() — the same trigger the command
// palette uses — rather than driving the OAuth redirect flow directly, so
// this toast can't drift out of sync with the one place that flow lives.
export const GoogleReconnectToast = ({
  toastId,
}: GoogleReconnectToastProps) => {
  const { connect } = useConnectGoogle();

  const handleReconnect = () => {
    getToast().dismiss(toastId);
    connect();
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
        onClick={handleReconnect}
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

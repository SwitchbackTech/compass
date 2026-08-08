import { createElement } from "react";
import { type Id } from "react-toastify";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { GOOGLE_DELAYED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";

interface GoogleDelayedToastProps {
  toastId: Id;
}

// Shown when Sync reports delayed / soft ATTENTION so returning users get an
// actionable Refresh rather than a dead-end warning. Mirrors the reconnect
// toast layout and delegates to useConnectGoogle().refresh().
export const GoogleDelayedToast = ({ toastId }: GoogleDelayedToastProps) => {
  const { refresh } = useConnectGoogle();

  const handleRefresh = () => {
    getToast().dismiss(toastId);
    refresh();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="font-medium text-sm text-text">
        Calendar updates are delayed
      </p>
      <p className="text-sm text-text">
        Updates are taking longer than expected. Try Refresh, or reconnect if
        this continues.
      </p>
      <button
        className="w-full rounded bg-accent-secondary px-3 py-2 font-medium text-on-accent text-sm transition-colors hover:bg-accent-secondary-hover"
        onClick={handleRefresh}
        type="button"
      >
        Refresh calendar
      </button>
    </div>
  );
};

export function showGoogleDelayedToast(): Id {
  return showErrorToast(
    createElement(GoogleDelayedToast, { toastId: GOOGLE_DELAYED_TOAST_ID }),
    {
      toastId: GOOGLE_DELAYED_TOAST_ID,
      severity: ErrorToastSeverity.CRITICAL,
    },
  );
}

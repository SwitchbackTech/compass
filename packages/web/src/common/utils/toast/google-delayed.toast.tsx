import { createElement } from "react";
import { type Id } from "react-toastify";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { GOOGLE_DELAYED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { ToastActionButton } from "@web/common/utils/toast/ToastActionButton";
import { getToast } from "@web/common/utils/toast/toast.port";
import { useToastPrimaryActionShortcut } from "@web/common/utils/toast/useToastPrimaryActionShortcut";

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

  useToastPrimaryActionShortcut(handleRefresh);

  return (
    <div className="flex w-full flex-col gap-2" data-notice="">
      <p className="font-medium text-sm text-text">
        Calendar updates are delayed
      </p>
      <p className="text-sm text-text">
        Updates are taking longer than expected. Try Refresh, or reconnect if
        this continues.
      </p>
      <ToastActionButton onClick={handleRefresh}>
        Refresh calendar
      </ToastActionButton>
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

// The toast is CRITICAL severity (autoClose: false, closeOnClick: false) so
// it never disappears on its own - without this, it can sit on screen after
// the connection is healthy again, contradicting its own "delayed" copy.
export function dismissGoogleDelayedToast(): void {
  getToast().dismiss(GOOGLE_DELAYED_TOAST_ID);
}

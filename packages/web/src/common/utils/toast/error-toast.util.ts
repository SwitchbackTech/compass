import { createElement } from "react";
import { Id, ToastContent, ToastOptions, toast } from "react-toastify";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";

export const SESSION_EXPIRED_TOAST_ID = "session-expired-api";
export const SESSION_EXPIRED_REAUTH_EVENT = "compass:session-expired-reauth";

export enum ErrorToastSeverity {
  DEFAULT = "default",
  CRITICAL = "critical",
}

export interface ErrorToastConfig {
  toastId?: Id;
  severity?: ErrorToastSeverity;
  options?: ToastOptions;
}

const criticalErrorToastOptions: ToastOptions = {
  autoClose: false,
  closeOnClick: false,
  draggable: false,
};

export function showErrorToast(
  message: ToastContent,
  config: ErrorToastConfig = {},
): Id {
  const { toastId, severity = ErrorToastSeverity.DEFAULT, options } = config;

  if (toastId && toast.isActive(toastId)) {
    return toastId;
  }

  const severityOptions =
    severity === ErrorToastSeverity.CRITICAL ? criticalErrorToastOptions : {};

  return toast.error(message, {
    ...toastDefaultOptions,
    ...severityOptions,
    ...options,
    ...(toastId ? { toastId } : {}),
  });
}

export function dismissErrorToast(toastId: Id): void {
  toast.dismiss(toastId);
}

export function requestSessionExpiredReauth(): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(SESSION_EXPIRED_REAUTH_EVENT));
}

export function showSessionExpiredToast(): Id {
  return showErrorToast(
    createElement(SessionExpiredToast, {
      toastId: SESSION_EXPIRED_TOAST_ID,
      onReconnect: requestSessionExpiredReauth,
    }),
    {
      toastId: SESSION_EXPIRED_TOAST_ID,
      severity: ErrorToastSeverity.CRITICAL,
    },
  );
}

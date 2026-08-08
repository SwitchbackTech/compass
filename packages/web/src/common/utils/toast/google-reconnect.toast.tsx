import { createElement } from "react";
import { type Id } from "react-toastify";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type GoogleReconnectTarget } from "@web/auth/google/state/google.reconnect.state";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";

let hasShownReconnectToastThisLoad = false;

/** True after any path has already raised the reconnect toast this page load. */
export const hasShownGoogleReconnectToastThisLoad = (): boolean =>
  hasShownReconnectToastThisLoad;

export const clearGoogleReconnectToastGate = (): void => {
  hasShownReconnectToastThisLoad = false;
};

interface GoogleReconnectToastProps {
  toastId: Id;
  accountEmail?: string | null;
  connectionId?: string | null;
}

const toastScopedConnection = (
  connectionId: string | null | undefined,
  accountEmail: string | null | undefined,
): GoogleSyncConnectionSummary => ({
  id: connectionId?.trim() || "reconnect-target",
  state: "actionRequired",
  stateReason: "authorizationRevoked",
  lastSyncedAt: null,
  lastHealthyAt: null,
  accountEmail: accountEmail ?? null,
  connectionState: "RECONNECT_REQUIRED",
});

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
  accountEmail,
  connectionId,
}: GoogleReconnectToastProps) => {
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const connectionFromStore =
    connections.find((entry) => entry.id === connectionId) ??
    connections.find((entry) => entry.accountEmail === accountEmail) ??
    null;
  // Props keep the target even while metadata is refetching, so Reconnect
  // still binds OAuth to the broken connectionId instead of adding a new one.
  const connection =
    connectionFromStore ??
    (connectionId ? toastScopedConnection(connectionId, accountEmail) : null);
  const { connect } = useConnectGoogle(connection ? { connection } : undefined);

  const handleReconnect = () => {
    getToast().dismiss(toastId);
    connect();
  };

  const namedAccount = accountEmail?.trim();

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="font-medium text-sm text-text">
        {namedAccount
          ? `Google Calendar disconnected (${namedAccount})`
          : "Google Calendar disconnected"}
      </p>
      <p className="text-sm text-text">
        {namedAccount
          ? `Access for ${namedAccount} expired or was revoked. Your events are still safe in Google. Reconnect and Compass will re-import them.`
          : "This happens when access expires or is revoked. Your events are still safe in Google. Reconnect and Compass will re-import them."}
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

export function showGoogleReconnectToast(
  target: GoogleReconnectTarget = {},
): Id {
  hasShownReconnectToastThisLoad = true;
  return showErrorToast(
    createElement(GoogleReconnectToast, {
      toastId: GOOGLE_REVOKED_TOAST_ID,
      accountEmail: target.accountEmail,
      connectionId: target.connectionId,
    }),
    {
      toastId: GOOGLE_REVOKED_TOAST_ID,
      severity: ErrorToastSeverity.CRITICAL,
    },
  );
}

export function dismissGoogleReconnectToast(): void {
  getToast().dismiss(GOOGLE_REVOKED_TOAST_ID);
}

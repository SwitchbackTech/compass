import { createElement } from "react";
import { type Id } from "react-toastify";
import {
  type ProviderKind,
  providerDisplayName,
} from "@core/types/sync/identity.contracts";
import { type SyncConnectionSummary } from "@core/types/user.types";
import { type GoogleReconnectTarget } from "@web/auth/google/state/google.reconnect.state";
import { connectionProviderKind } from "@web/auth/providers/connection-provider.util";
import { useConnectProvider } from "@web/auth/providers/useConnectProvider";
import {
  selectSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import {
  rememberPendingReconnect,
  shouldDeferAttentionToasts,
  takePendingReconnect,
} from "@web/billing/billing-gate-attention";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import {
  ErrorToastSeverity,
  showErrorToast,
} from "@web/common/utils/toast/error-toast.util";
import { ToastActionButton } from "@web/common/utils/toast/ToastActionButton";
import { ToastNotice } from "@web/common/utils/toast/ToastNotice";
import { getToast } from "@web/common/utils/toast/toast.port";
import { CONNECTION_BANNER_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";

let hasShownReconnectToastThisLoad = false;
let lastReconnectTarget: GoogleReconnectTarget = {};

/** True after any path has already raised the reconnect toast this page load. */
export const hasShownGoogleReconnectToastThisLoad = (): boolean =>
  hasShownReconnectToastThisLoad;

export const clearGoogleReconnectToastGate = (): void => {
  hasShownReconnectToastThisLoad = false;
};

export function resetGoogleReconnectToastStateForTests(): void {
  hasShownReconnectToastThisLoad = false;
  lastReconnectTarget = {};
}

interface GoogleReconnectToastProps {
  toastId: Id;
  accountEmail?: string | null;
  connectionId?: string | null;
}

const toastScopedConnection = (
  connectionId: string | null | undefined,
  accountEmail: string | null | undefined,
  provider: ProviderKind = "google",
): SyncConnectionSummary => ({
  id: connectionId?.trim() || "reconnect-target",
  provider,
  state: "actionRequired",
  stateReason: "authorizationRevoked",
  lastSyncedAt: null,
  lastHealthyAt: null,
  accountEmail: accountEmail ?? null,
  connectionState: "RECONNECT_REQUIRED",
  canSuggestContacts: false,
});

const reconnectToastTitle = (
  provider: ProviderKind,
  namedAccount?: string,
): string => {
  const calendarName = `${providerDisplayName(provider)} Calendar`;
  return namedAccount
    ? `${calendarName} disconnected (${namedAccount})`
    : `${calendarName} disconnected`;
};

const reconnectToastBody = (
  provider: ProviderKind,
  namedAccount?: string,
): string => {
  const host = providerDisplayName(provider);
  if (namedAccount) {
    return `Access for ${namedAccount} expired or was revoked. Your events are still safe in ${host}. Reconnect and Compass will re-import them.`;
  }
  return `This happens when access expires or is revoked. Your events are still safe in ${host}. Reconnect and Compass will re-import them.`;
};

const reconnectActionLabel = (provider: ProviderKind): string =>
  `Reconnect ${providerDisplayName(provider)} Calendar`;

export const GoogleReconnectToast = ({
  toastId,
  accountEmail,
  connectionId,
}: GoogleReconnectToastProps) => {
  const connections = useUserMetadataStore(selectSyncConnections);
  const connectionFromStore =
    connections.find((entry) => entry.id === connectionId) ??
    connections.find((entry) => entry.accountEmail === accountEmail) ??
    null;
  const connection =
    connectionFromStore ??
    (connectionId ? toastScopedConnection(connectionId, accountEmail) : null);
  const provider = connectionProviderKind(connection);
  const { connect } = useConnectProvider(
    provider,
    connection ? { connection } : undefined,
  );

  const handleReconnect = () => {
    getToast().dismiss(toastId);
    connect();
  };

  const namedAccount = accountEmail?.trim();

  return (
    <ToastNotice>
      <p className="font-medium text-sm text-text">
        {reconnectToastTitle(provider, namedAccount || undefined)}
      </p>
      <p className="text-sm text-text">
        {reconnectToastBody(provider, namedAccount || undefined)}
      </p>
      <ToastActionButton
        onClick={handleReconnect}
        shortcutKey={CONNECTION_BANNER_SHORTCUT_KEY}
      >
        {reconnectActionLabel(provider)}
      </ToastActionButton>
    </ToastNotice>
  );
};

export function showGoogleReconnectToast(
  target: GoogleReconnectTarget = {},
): Id {
  lastReconnectTarget = target;
  if (shouldDeferAttentionToasts()) {
    rememberPendingReconnect(target);
    return GOOGLE_REVOKED_TOAST_ID;
  }

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

export function deferGoogleReconnectToastIfVisible(): void {
  const toast = getToast();
  const visible = toast.isActive?.(GOOGLE_REVOKED_TOAST_ID) === true;
  if (!visible && !hasShownReconnectToastThisLoad) return;

  rememberPendingReconnect(lastReconnectTarget);
  hasShownReconnectToastThisLoad = false;
  dismissGoogleReconnectToast();
}

export function flushDeferredGoogleReconnectToast(): void {
  const pending = takePendingReconnect();
  if (!pending) return;
  showGoogleReconnectToast(pending);
}

export function dismissGoogleReconnectToast(): void {
  getToast().dismiss(GOOGLE_REVOKED_TOAST_ID);
}

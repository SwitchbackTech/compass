import { type FC, useState } from "react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useDisconnectGoogleAccount } from "@web/auth/google/hooks/useDisconnectGoogleAccount";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { SYNC_STATUS_VARIANT_CLASSNAME } from "@web/calendars/sync-status.types";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

interface ManageAccountsDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export function ManageAccountsDialog({
  isOpen,
  onDismiss,
}: ManageAccountsDialogProps) {
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const { connect, isAvailable, isConnecting } = useConnectGoogle();
  const { disconnect, disconnectingId } = useDisconnectGoogleAccount();

  if (!isOpen) return null;

  return (
    <OverlayPanel
      align="start"
      onDismiss={onDismiss}
      title="Google accounts"
      variant="modal"
      widthClassName="w-[420px]"
    >
      <div className="flex w-full flex-col gap-3">
        {connections.length === 0 ? (
          <p className="text-sm text-text-muted">No accounts connected yet.</p>
        ) : (
          connections.map((connection) => (
            <AccountRow
              connection={connection}
              disconnect={disconnect}
              isDisconnecting={disconnectingId === connection.id}
              key={connection.id}
            />
          ))
        )}
      </div>

      <OverlayPanelActions align="start">
        {isAvailable ? (
          <OverlayPanelActionButton
            aria-busy={isConnecting || undefined}
            disabled={isConnecting}
            onClick={connect}
            variant="primary"
          >
            {isConnecting ? "Opening Google…" : "Add account"}
          </OverlayPanelActionButton>
        ) : null}
        <OverlayPanelActionButton onClick={onDismiss}>
          Done
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}

interface AccountRowProps {
  connection: GoogleSyncConnectionSummary;
  disconnect: (connectionId: string, accountEmail: string) => Promise<void>;
  isDisconnecting: boolean;
}

/**
 * One connected account: email, its own sync status, and a two-step
 * disconnect (not undoable without redoing the whole OAuth flow, so the
 * first press swaps in an explicit confirm - same shape the sidebar's
 * per-account header used to own directly).
 */
const AccountRow: FC<AccountRowProps> = ({
  connection,
  disconnect,
  isDisconnecting,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const accountEmail = connection.accountEmail ?? "Unknown account";
  const status = getGoogleSyncStatus(
    connection.connectionState ?? "NOT_CONNECTED",
    connection,
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-text" translate="no">
          {accountEmail}
        </p>
        {status ? (
          <p
            className={`text-xs ${SYNC_STATUS_VARIANT_CLASSNAME[status.variant]}`}
          >
            {status.text}
          </p>
        ) : null}
      </div>
      {isConfirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-busy={isDisconnecting || undefined}
            aria-label={`Confirm disconnecting ${accountEmail}`}
            className="c-focus-ring rounded-xs px-1.5 py-0.5 text-error text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
            disabled={isDisconnecting}
            onClick={() =>
              void disconnect(connection.id, accountEmail).finally(() =>
                setIsConfirming(false),
              )
            }
            type="button"
          >
            {isDisconnecting ? "Disconnecting…" : "Confirm"}
          </button>
          <button
            className="c-focus-ring rounded-xs px-1.5 py-0.5 text-text-muted text-xs hover:text-text disabled:pointer-events-none disabled:opacity-60"
            disabled={isDisconnecting}
            onClick={() => setIsConfirming(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          aria-label={`Disconnect ${accountEmail}`}
          className="c-focus-ring shrink-0 rounded-xs px-1.5 py-0.5 text-text-muted text-xs hover:text-text"
          onClick={() => setIsConfirming(true)}
          type="button"
        >
          Disconnect
        </button>
      )}
    </div>
  );
};

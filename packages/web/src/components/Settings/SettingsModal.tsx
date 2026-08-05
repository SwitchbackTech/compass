import { type FC, useEffect, useRef, useState } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  formatLastSyncedLabel,
  getGoogleSyncStatus,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useDisconnectGoogleAccount } from "@web/auth/google/hooks/useDisconnectGoogleAccount";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import {
  compareCalendars,
  getWritableCalendars,
  groupCalendarsByAccount,
} from "@web/calendars/calendar.util";
import {
  setDefaultCalendarId,
  useDefaultCalendarId,
} from "@web/calendars/default-calendar.store";
import { SyncStatusLine } from "@web/calendars/SyncStatusLine";
import {
  useConnectedAccountEmails,
  useDefaultTargetCalendar,
} from "@web/calendars/useDefaultTargetCalendar";
import { EXPORT_MY_DATA_TOAST_ID } from "@web/common/constants/toast.constants";
import { runExportMyData } from "@web/common/storage/offline-data/export-user-data.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { useDeleteAccountConfirmation } from "@web/components/DeleteAccountConfirmation/hooks/useDeleteAccountConfirmation";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import {
  selectIsSettingsOpen,
  settingsActions,
  useSettingsStore,
} from "@web/settings/settings.store";
import { useAppLockReason } from "@web/shortcuts/app-lock";

const OUTLINE_BUTTON_CLASSNAME =
  "c-focus-ring shrink-0 rounded border border-border bg-surface-overlay px-2 py-1 text-xs text-text transition-colors hover:bg-surface-panel disabled:pointer-events-none disabled:opacity-60";

/**
 * The app's Settings menu (Mod+,): a nav shell (one item today - Accounts)
 * holding default-calendar choice and connected-account management, which
 * used to live scattered across the sidebar (the default-calendar star) and
 * a dedicated "manage accounts" dialog. ESC steps back a level - out of an
 * open disconnect confirmation first, then out of the modal - via
 * `handleDismiss`, since OverlayPanel already routes both ESC and a
 * backdrop click through `onDismiss`.
 */
export const SettingsModal: FC = () => {
  const isOpen = useSettingsStore(selectIsSettingsOpen);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  useAppLockReason("settingsModal", isOpen);
  const { openDeleteAccountConfirmation } = useDeleteAccountConfirmation();

  // The modal stays mounted (self-reads the store) so a stray close path
  // that skips handleDismiss (e.g. the Mod+, toggle) can't leave a
  // disconnect confirmation pre-armed on next open.
  useEffect(() => {
    if (!isOpen) setConfirmingId(null);
  }, [isOpen]);

  const { data } = useCalendarsQuery();
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const accountEmailOrder = useConnectedAccountEmails();
  const writableCalendars = getWritableCalendars(data ?? []).sort(
    compareCalendars(accountEmailOrder),
  );
  const resolvedDefault = useDefaultTargetCalendar(writableCalendars);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (confirmingId !== null) {
      setConfirmingId(null);
      return;
    }
    settingsActions.closeSettings();
  };

  const handleExport = () => {
    runExportMyData()
      .then(() => {
        showStatusToast(EXPORT_MY_DATA_TOAST_ID, "Data exported");
      })
      .catch(() => {
        showErrorToast("Couldn't export your data. Please try again.", {
          toastId: EXPORT_MY_DATA_TOAST_ID,
        });
      });
  };

  // Closes Settings first rather than stacking two OverlayPanels at once.
  const handleDeleteAccount = () => {
    settingsActions.closeSettings();
    openDeleteAccountConfirmation();
  };

  return (
    <OverlayPanel
      align="start"
      onDismiss={handleDismiss}
      title="Settings"
      variant="modal"
      widthClassName="w-[640px]"
    >
      <div className="flex w-full gap-6">
        <nav className="w-32 shrink-0">
          <button
            aria-current="true"
            className="w-full rounded bg-surface-overlay px-2 py-1 text-left text-sm text-text"
            type="button"
          >
            Accounts
          </button>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <DefaultCalendarPicker
            calendars={writableCalendars}
            connections={connections}
            resolvedDefault={resolvedDefault}
          />
          <AccountsSection
            confirmingId={confirmingId}
            connections={connections}
            resolvedDefault={resolvedDefault}
            setConfirmingId={setConfirmingId}
          />
          <div className="mt-2 border-border border-t pt-3">
            <OverlayPanelActions align="start">
              <OverlayPanelActionButton
                onClick={handleExport}
                variant="secondary"
              >
                Export data
              </OverlayPanelActionButton>
              <OverlayPanelActionButton
                onClick={handleDeleteAccount}
                variant="destructive"
              >
                Delete account
              </OverlayPanelActionButton>
            </OverlayPanelActions>
          </div>
        </div>
      </div>
    </OverlayPanel>
  );
};

interface DefaultCalendarPickerProps {
  calendars: Calendar[];
  connections: GoogleSyncConnectionSummary[];
  resolvedDefault: Calendar | undefined;
}

const DefaultCalendarPicker: FC<DefaultCalendarPickerProps> = ({
  calendars,
  connections,
  resolvedDefault,
}) => {
  const storedId = useDefaultCalendarId();
  const value = storedId ?? resolvedDefault?.id ?? "";

  if (calendars.length === 0) return null;

  const { groups, ungrouped } = groupCalendarsByAccount(calendars, connections);

  return (
    <div>
      <label
        className="mb-1 block text-sm text-text"
        htmlFor="default-calendar"
      >
        Default Calendar
      </label>
      <select
        className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
        id="default-calendar"
        onChange={(e) => setDefaultCalendarId(e.target.value as CalendarId)}
        value={value}
      >
        {groups.map((group) => (
          <optgroup key={group.accountEmail} label={group.accountEmail}>
            {group.calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
              </option>
            ))}
          </optgroup>
        ))}
        {ungrouped.map((calendar) => (
          <option key={calendar.id} value={calendar.id}>
            {calendar.name}
          </option>
        ))}
      </select>
    </div>
  );
};

interface AccountsSectionProps {
  confirmingId: string | null;
  connections: GoogleSyncConnectionSummary[];
  resolvedDefault: Calendar | undefined;
  setConfirmingId: (id: string | null) => void;
}

const AccountsSection: FC<AccountsSectionProps> = ({
  confirmingId,
  connections,
  resolvedDefault,
  setConfirmingId,
}) => {
  const { connect, isAvailable, isConnecting } = useConnectGoogle();
  const { disconnect, disconnectingId } = useDisconnectGoogleAccount();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {connections.length === 0 ? (
          <p className="text-sm text-text-muted">No accounts connected yet.</p>
        ) : (
          connections.map((connection) => (
            <AccountRow
              connection={connection}
              disconnect={disconnect}
              isConfirming={confirmingId === connection.id}
              isDefault={
                connection.accountEmail === resolvedDefault?.accountEmail
              }
              isDisconnecting={disconnectingId === connection.id}
              key={connection.id}
              setConfirming={(confirming) =>
                setConfirmingId(confirming ? connection.id : null)
              }
            />
          ))
        )}
      </div>

      {isAvailable ? (
        <OverlayPanelActions align="start">
          <OverlayPanelActionButton
            aria-busy={isConnecting || undefined}
            disabled={isConnecting}
            onClick={connect}
            variant="primary"
          >
            {isConnecting ? "Opening Google…" : "Add account"}
          </OverlayPanelActionButton>
        </OverlayPanelActions>
      ) : null}
    </div>
  );
};

interface AccountRowProps {
  connection: GoogleSyncConnectionSummary;
  disconnect: (connectionId: string, accountEmail: string) => Promise<void>;
  isConfirming: boolean;
  isDefault: boolean;
  isDisconnecting: boolean;
  setConfirming: (confirming: boolean) => void;
}

/**
 * One connected account: email, its own full sync status (including when
 * healthy - the sidebar hides that, but this is the one place a user comes
 * to check), a "Default" badge when it owns the default calendar, and a
 * two-step disconnect (not undoable without redoing the whole OAuth flow).
 */
const AccountRow: FC<AccountRowProps> = ({
  connection,
  disconnect,
  isConfirming,
  isDefault,
  isDisconnecting,
  setConfirming,
}) => {
  const accountEmail = connection.accountEmail ?? "Unknown account";
  const status = getGoogleSyncStatus(
    connection.connectionState ?? "NOT_CONNECTED",
    connection,
  );
  const lastSyncedLabel =
    status?.variant === "healthy"
      ? formatLastSyncedLabel(connection.lastSyncedAt)
      : null;
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const disconnectButtonRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(isConfirming);

  // Both directions replace whichever button had focus with a fresh one, so
  // without this, focus falls back to <body> - outside the panel, which
  // breaks the modal's ESC-steps-back handling (OverlayPanel's Escape
  // listener only fires for events bubbling from inside it).
  useEffect(() => {
    if (isConfirming) confirmButtonRef.current?.focus();
    else if (wasConfirmingRef.current) disconnectButtonRef.current?.focus();
    wasConfirmingRef.current = isConfirming;
  }, [isConfirming]);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm text-text" translate="no">
            {accountEmail}
          </p>
          {isDefault ? (
            <span className="shrink-0 rounded border border-border px-1.5 text-text-muted text-xs">
              Default
            </span>
          ) : null}
        </div>
        <SyncStatusLine status={status} />
        {lastSyncedLabel ? (
          <p className="text-text-muted text-xs">{lastSyncedLabel}</p>
        ) : null}
      </div>
      {isConfirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-busy={isDisconnecting || undefined}
            aria-label={`Confirm disconnecting ${accountEmail}`}
            className={`${OUTLINE_BUTTON_CLASSNAME} text-error`}
            disabled={isDisconnecting}
            onClick={() =>
              void disconnect(connection.id, accountEmail).finally(() =>
                setConfirming(false),
              )
            }
            ref={confirmButtonRef}
            type="button"
          >
            {isDisconnecting ? "Disconnecting…" : "Confirm"}
          </button>
          <button
            className={OUTLINE_BUTTON_CLASSNAME}
            disabled={isDisconnecting}
            onClick={() => setConfirming(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          aria-label={`Disconnect ${accountEmail}`}
          className={OUTLINE_BUTTON_CLASSNAME}
          onClick={() => setConfirming(true)}
          ref={disconnectButtonRef}
          type="button"
        >
          Disconnect
        </button>
      )}
    </div>
  );
};

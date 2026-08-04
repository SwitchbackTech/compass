import { CaretDownIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { type FC, useCallback, useMemo, useSyncExternalStore } from "react";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/compass/state/auth.state.util";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import {
  formatLastSyncedLabel,
  getGoogleSyncStatus,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import {
  accountCalendarListId,
  SINGLE_ACCOUNT_COLLAPSE_KEY,
  toggleAccountCollapsed,
  useCollapsedAccountKeys,
} from "@web/calendars/collapsed-accounts.store";
import {
  SYNC_STATUS_VARIANT_CLASSNAME,
  type SyncStatus,
} from "@web/calendars/sync-status.types";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";
import { AddAccountButton } from "./AddAccountButton";

const ANONYMOUS_SAVE_MESSAGE = "Sign up to save your changes across browsers";

const TOOLTIP_ACTION_BUTTON_CLASSNAME =
  "c-focus-ring self-start rounded-xs bg-accent px-2 py-1 font-medium text-s text-on-accent hover:brightness-110";

const HEADER_ROW_CLASSNAME =
  "group/header mb-2 flex min-w-0 items-center justify-between gap-1";

const HEADING_CLASSNAME =
  "flex min-w-0 flex-1 font-semibold text-sm leading-none";

const ANONYMOUS_ACCOUNT_TRIGGER_CLASSNAME =
  "min-w-0 truncate appearance-none border-0 bg-transparent p-0 text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const CONNECT_GOOGLE_BUTTON_CLASSNAME =
  "c-focus-ring mb-2 w-full rounded-xs bg-accent px-2 py-1.5 text-left font-medium text-on-accent text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60";

const getSidebarSyncStatus = ({
  googleStatus,
  hasPendingEventMutations,
  isConnecting,
  state,
}: {
  googleStatus: SyncStatus;
  hasPendingEventMutations: boolean;
  isConnecting: boolean;
  state: GoogleUiState;
}): SyncStatus => {
  if (isConnecting) {
    return {
      variant: "syncing",
      text:
        state === "RECONNECT_REQUIRED"
          ? "Reconnecting your calendar…"
          : "Connecting your calendar…",
    };
  }

  if (googleStatus && googleStatus.variant !== "healthy") {
    return googleStatus;
  }

  if (hasPendingEventMutations) {
    return { variant: "syncing", text: "Saving changes…" };
  }

  return googleStatus;
};

/**
 * The calendar list's heading is the account identity (email, or the
 * not-saved-yet label when anonymous) rather than a generic "Calendars"
 * title, and carries the syncing wave shimmer plus the sign-up-to-save CTA
 * for anonymous users. Google connection actions and status live here so
 * users have one reliable place to check their calendar.
 */
export const CalendarListHeader: FC = () => {
  const { email } = useUser();

  if (!email) {
    return <AnonymousAccountHeader />;
  }

  return <AuthenticatedAccountHeader email={email} />;
};

const AnonymousAccountHeader: FC = () => {
  const { openModal } = useAuthModal();
  const isDirty = useSyncExternalStore(
    subscribeToAuthState,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
  );
  const accountLabel = "Saved on this device";
  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  return (
    <h2 className={classNames(HEADING_CLASSNAME, "mb-2")}>
      <Tooltip interactive>
        <TooltipTrigger asChild>
          <button
            className={classNames(
              ANONYMOUS_ACCOUNT_TRIGGER_CLASSNAME,
              isDirty ? "c-sync-text-wave" : "text-text",
            )}
            onClick={handleOpenSignUp}
            type="button"
          >
            {accountLabel}
          </button>
        </TooltipTrigger>
        <TooltipContent className="flex max-w-55 flex-col gap-1.5">
          <span>{ANONYMOUS_SAVE_MESSAGE}</span>
          <button
            className={TOOLTIP_ACTION_BUTTON_CLASSNAME}
            onClick={handleOpenSignUp}
            type="button"
          >
            Sign up
          </button>
        </TooltipContent>
      </Tooltip>
    </h2>
  );
};

const AuthenticatedAccountHeader: FC<{ email: string }> = ({ email }) => {
  // This header shows before per-account sections take over (single account,
  // or the moment metadata loads for a multi-account user) - it must show
  // THIS email's own status, not sync's precedence-winning "most actionable
  // connection across everyone", or a second account's problem flashes under
  // the first account's name for as long as that gap lasts (2026-08-04,
  // caught disconnecting one of two live accounts).
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const ownConnection = useMemo(
    () => connections.find((c) => c.accountEmail === email) ?? null,
    [connections, email],
  );
  const { commandAction, isAvailable, isConnecting, isRefreshing, state } =
    useConnectGoogle({ connection: ownConnection });
  const hasPendingEventMutations = useHasPendingEventMutations();
  const syncStatus = getSidebarSyncStatus({
    googleStatus: getGoogleSyncStatus(state, ownConnection),
    hasPendingEventMutations,
    isConnecting,
    state,
  });
  const isSyncing =
    syncStatus?.variant === "syncing" || hasPendingEventMutations;
  const showGoogleAction = isAvailable && commandAction != null;
  const lastSyncedLabel =
    syncStatus?.variant === "healthy"
      ? formatLastSyncedLabel(ownConnection?.lastSyncedAt)
      : null;
  const googleActionLabel =
    commandAction == null
      ? null
      : isConnecting
        ? state === "RECONNECT_REQUIRED"
          ? "Reconnecting…"
          : "Connecting…"
        : isRefreshing
          ? "Refreshing…"
          : commandAction.label;
  const collapsedKeys = useCollapsedAccountKeys();
  const isCollapsed = collapsedKeys.has(SINGLE_ACCOUNT_COLLAPSE_KEY);

  return (
    <>
      <div className={HEADER_ROW_CLASSNAME}>
        <h2 className={HEADING_CLASSNAME}>
          <button
            aria-controls={accountCalendarListId(SINGLE_ACCOUNT_COLLAPSE_KEY)}
            aria-expanded={!isCollapsed}
            className="c-focus-ring flex w-full min-w-0 items-center gap-1 rounded-xs text-left"
            onClick={() => toggleAccountCollapsed(SINGLE_ACCOUNT_COLLAPSE_KEY)}
            type="button"
          >
            <CaretDownIcon
              aria-hidden="true"
              className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              size={12}
            />
            <span
              className={classNames(
                "min-w-0 truncate",
                isSyncing ? "c-sync-text-wave" : "text-text",
              )}
              translate="no"
            >
              {email}
            </span>
          </button>
        </h2>
        <AddAccountButton />
      </div>
      {syncStatus ? (
        <p
          aria-live="polite"
          className={`mb-1 text-xs ${SYNC_STATUS_VARIANT_CLASSNAME[syncStatus.variant]}`}
          role="status"
        >
          {syncStatus.text}
        </p>
      ) : null}
      {lastSyncedLabel ? (
        <p className="mb-2 text-text-muted text-xs">{lastSyncedLabel}</p>
      ) : null}
      {showGoogleAction &&
      commandAction != null &&
      googleActionLabel != null ? (
        <button
          aria-busy={isConnecting || isRefreshing || undefined}
          className={CONNECT_GOOGLE_BUTTON_CLASSNAME}
          disabled={isConnecting || isRefreshing}
          onClick={commandAction.onSelect}
          type="button"
        >
          {googleActionLabel}
        </button>
      ) : null}
    </>
  );
};

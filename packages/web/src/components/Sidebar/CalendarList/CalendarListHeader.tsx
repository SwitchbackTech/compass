import classNames from "classnames";
import { type FC, useCallback, useSyncExternalStore } from "react";
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
  selectGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
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

const ANONYMOUS_SAVE_MESSAGE = "Sign up to save your changes across browsers";

const TOOLTIP_ACTION_BUTTON_CLASSNAME =
  "c-focus-ring self-start rounded-xs bg-accent px-2 py-1 font-medium text-s text-on-accent hover:brightness-110";

const HEADING_CLASSNAME =
  "mb-2 flex min-w-0 font-semibold text-sm leading-none";

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
    <h2 className={HEADING_CLASSNAME}>
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
  const { commandAction, isAvailable, isConnecting, isRefreshing, state } =
    useConnectGoogle();
  const syncConnection = useUserMetadataStore(selectGoogleSyncConnection);
  const hasPendingEventMutations = useHasPendingEventMutations();
  const syncStatus = getSidebarSyncStatus({
    googleStatus: getGoogleSyncStatus(state, syncConnection),
    hasPendingEventMutations,
    isConnecting,
    state,
  });
  const isSyncing =
    syncStatus?.variant === "syncing" || hasPendingEventMutations;
  const showGoogleAction = isAvailable && commandAction != null;
  const lastSyncedLabel =
    syncStatus?.variant === "healthy"
      ? formatLastSyncedLabel(syncConnection?.lastSyncedAt)
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

  return (
    <>
      <h2 className={HEADING_CLASSNAME}>
        <span
          className={classNames(
            "min-w-0 truncate",
            isSyncing ? "c-sync-text-wave" : "text-text",
          )}
          translate="no"
        >
          {email}
        </span>
      </h2>
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

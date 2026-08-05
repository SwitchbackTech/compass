import classNames from "classnames";
import { type FC, useCallback, useMemo, useSyncExternalStore } from "react";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/compass/state/auth.state.util";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getSidebarSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { SyncStatusLine } from "@web/calendars/SyncStatusLine";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";

const ANONYMOUS_SAVE_MESSAGE = "Sign up to save your changes across browsers";

const TOOLTIP_ACTION_BUTTON_CLASSNAME =
  "c-focus-ring self-start rounded-xs bg-accent px-2 py-1 font-medium text-s text-on-accent hover:brightness-110";

const HEADING_CLASSNAME =
  "flex min-w-0 flex-1 font-semibold text-sm leading-none";

const ANONYMOUS_ACCOUNT_TRIGGER_CLASSNAME =
  "min-w-0 truncate appearance-none border-0 bg-transparent p-0 text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const CONNECT_GOOGLE_BUTTON_CLASSNAME =
  "c-focus-ring mb-2 w-full rounded-xs bg-accent px-2 py-1.5 text-left font-medium text-on-accent text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60";

/**
 * The heading shown before any account section exists: the not-saved-yet label
 * with its sign-up CTA when anonymous, and the signed-in email with the
 * connect-your-first-calendar CTA otherwise. Once calendars arrive each
 * account gets its own AccountSectionHeader instead, which is why this one
 * carries no collapse toggle - there is at most a lone local calendar under
 * it.
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
  // Metadata and the calendar list load a moment apart, so a connected user
  // can briefly land here. Show THIS email's own status, not sync's
  // precedence-winning "most actionable connection across everyone", or a
  // second account's problem flashes under the first account's name for as
  // long as that gap lasts (2026-08-04, caught disconnecting one of two live
  // accounts).
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const ownConnection = useMemo(
    () => connections.find((c) => c.accountEmail === email) ?? null,
    [connections, email],
  );
  const { commandAction, isAvailable, isConnecting, isRefreshing, state } =
    useConnectGoogle({ connection: ownConnection });
  const syncStatus = getSidebarSyncStatus({
    connection: ownConnection,
    isConnecting,
    state,
  });
  const actionLabel =
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
      <h2 className={classNames(HEADING_CLASSNAME, "mb-2")}>
        <span
          className={classNames(
            "min-w-0 truncate",
            syncStatus?.variant === "syncing"
              ? "c-sync-text-wave"
              : "text-text-muted",
          )}
          translate="no"
        >
          {email}
        </span>
      </h2>
      <SyncStatusLine className="mb-1" status={syncStatus} />
      {isAvailable && commandAction != null && actionLabel != null ? (
        <button
          aria-busy={isConnecting || isRefreshing || undefined}
          className={CONNECT_GOOGLE_BUTTON_CLASSNAME}
          disabled={isConnecting || isRefreshing}
          onClick={commandAction.onSelect}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </>
  );
};

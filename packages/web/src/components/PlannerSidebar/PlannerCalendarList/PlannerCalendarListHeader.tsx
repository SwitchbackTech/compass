import classNames from "classnames";
import { type FC, useCallback, useSyncExternalStore } from "react";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/compass/state/auth.state.util";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type GoogleAccountSummaryStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { getGoogleAccountSummaryStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { useHasPendingEventMutations } from "@web/events/mutations/useEventPending";

const TEMPORARY_ACCOUNT_MESSAGE = "Sign up to save your changes";

const TOOLTIP_ACTION_BUTTON_CLASSNAME =
  "c-focus-ring self-start rounded-xs bg-accent-primary px-2 py-1 font-medium text-s text-text-dark hover:brightness-110";

const HEADING_CLASSNAME =
  "mb-2 flex min-w-0 font-semibold text-sm leading-none";

// Shared by every account-label trigger (button or span) so the header's
// email/temporary-account text stays keyboard-focusable and reset the same way.
const TRIGGER_FOCUS_CLASSNAME =
  "min-w-0 truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary";
const TRIGGER_BUTTON_RESET_CLASSNAME =
  "appearance-none border-0 bg-transparent p-0 text-left font-semibold";

/**
 * The calendar list's heading is the account identity (email, or the
 * temporary-account label when anonymous) rather than a generic "Calendars"
 * title, and carries the sync status treatment (wave shimmer while syncing,
 * warning/error colors) plus the sign-up-to-save CTA for anonymous users.
 */
export const PlannerCalendarListHeader: FC = () => {
  const { email } = useUser();

  if (!email) {
    return <TemporaryAccountHeader />;
  }

  return <AuthenticatedAccountHeader email={email} />;
};

const TemporaryAccountHeader: FC = () => {
  const { openModal } = useAuthModal();
  const isDirty = useSyncExternalStore(
    subscribeToAuthState,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
  );
  const accountLabel = "Temporary account";
  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  return (
    <h2 className={HEADING_CLASSNAME}>
      <Tooltip interactive>
        <TooltipTrigger asChild>
          <button
            className={classNames(
              TRIGGER_FOCUS_CLASSNAME,
              TRIGGER_BUTTON_RESET_CLASSNAME,
              isDirty ? "c-sync-text-wave" : "text-text-lighter",
            )}
            onClick={handleOpenSignUp}
            type="button"
          >
            {accountLabel}
          </button>
        </TooltipTrigger>
        <TooltipContent className="flex max-w-55 flex-col gap-1.5">
          <span>{TEMPORARY_ACCOUNT_MESSAGE}</span>
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

const PENDING_EVENT_MUTATIONS_STATUS: GoogleAccountSummaryStatus = {
  variant: "syncing",
  tooltip: "Syncing changes…",
};

// Google's own actionable/syncing states always take priority over the local
// pending-mutations indicator, since they need to stay visible/actionable regardless
// of unrelated local writes still settling.
function resolveAccountSyncStatus(
  googleStatus: GoogleAccountSummaryStatus,
  hasPendingEventMutations: boolean,
): GoogleAccountSummaryStatus {
  const googleTakesPriority =
    googleStatus?.action != null || googleStatus?.variant === "syncing";

  if (!googleTakesPriority && hasPendingEventMutations) {
    return PENDING_EVENT_MUTATIONS_STATUS;
  }

  return googleStatus;
}

const SYNC_STATUS_VARIANT_CLASSNAME: Record<
  NonNullable<ReturnType<typeof getGoogleAccountSummaryStatus>>["variant"],
  string
> = {
  syncing: "c-sync-text-wave",
  healthy: "text-text-lighter",
  warning: "text-status-warning",
  error: "text-status-error",
};

const AuthenticatedAccountHeader: FC<{ email: string }> = ({ email }) => {
  const { state, onRepairGoogle, onOpenGoogleAuth } = useConnectGoogle();
  const hasPendingEventMutations = useHasPendingEventMutations();
  const accountLabel = email;
  const googleStatus = getGoogleAccountSummaryStatus(state, {
    onRepairGoogle,
    onOpenGoogleAuth,
  });
  const syncStatus = resolveAccountSyncStatus(
    googleStatus,
    hasPendingEventMutations,
  );

  const emailClassName = syncStatus
    ? SYNC_STATUS_VARIANT_CLASSNAME[syncStatus.variant]
    : "text-text-lighter";

  return (
    <>
      <h2 className={HEADING_CLASSNAME}>
        {syncStatus ? (
          <Tooltip interactive={!!syncStatus.action}>
            <TooltipTrigger asChild>
              {syncStatus.action ? (
                <button
                  className={classNames(
                    emailClassName,
                    TRIGGER_FOCUS_CLASSNAME,
                    TRIGGER_BUTTON_RESET_CLASSNAME,
                  )}
                  onClick={syncStatus.action.onClick}
                  translate="no"
                  type="button"
                >
                  {accountLabel}
                </button>
              ) : (
                <span
                  className={classNames(
                    emailClassName,
                    TRIGGER_FOCUS_CLASSNAME,
                  )}
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so useFocus can reveal the status tooltip via keyboard; there is no action to trigger here.
                  tabIndex={0}
                  translate="no"
                >
                  {accountLabel}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent className="flex max-w-55 flex-col gap-1.5">
              <span>{syncStatus.tooltip}</span>
              {syncStatus.action ? (
                <button
                  className={TOOLTIP_ACTION_BUTTON_CLASSNAME}
                  onClick={syncStatus.action.onClick}
                  type="button"
                >
                  {syncStatus.action.label}
                </button>
              ) : null}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span
            className={classNames(emailClassName, "min-w-0 truncate")}
            translate="no"
          >
            {accountLabel}
          </span>
        )}
      </h2>
      {syncStatus ? (
        // Outside the h2 so the status copy doesn't pollute the heading's
        // accessible name. `status` doesn't derive its accessible name from
        // text content per the ARIA spec, so an explicit aria-label is
        // required for the name to be announced/queryable (e.g. by role+name
        // in tests).
        <span
          aria-label={syncStatus.tooltip}
          aria-live="polite"
          className="sr-only"
          role="status"
        >
          {syncStatus.tooltip}
        </span>
      ) : null}
    </>
  );
};

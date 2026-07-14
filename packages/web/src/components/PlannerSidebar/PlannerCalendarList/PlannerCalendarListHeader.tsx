import classNames from "classnames";
import { type FC, useCallback, useSyncExternalStore } from "react";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/compass/state/auth.state.util";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleSyncStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
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
 * title, and carries the syncing wave shimmer plus the sign-up-to-save CTA
 * for anonymous users. Detailed sync status lives in the command palette.
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

const AuthenticatedAccountHeader: FC<{ email: string }> = ({ email }) => {
  const { state } = useConnectGoogle();
  const hasPendingEventMutations = useHasPendingEventMutations();
  const isSyncing =
    getGoogleSyncStatus(state)?.variant === "syncing" ||
    hasPendingEventMutations;

  return (
    <>
      <h2 className={HEADING_CLASSNAME}>
        <span
          className={classNames(
            "min-w-0 truncate",
            isSyncing ? "c-sync-text-wave" : "text-text-lighter",
          )}
          translate="no"
        >
          {email}
        </span>
      </h2>
      {isSyncing ? (
        <span
          aria-label="Syncing…"
          aria-live="polite"
          className="sr-only"
          role="status"
        >
          Syncing…
        </span>
      ) : null}
    </>
  );
};

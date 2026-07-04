import { InfoIcon } from "@phosphor-icons/react";
import { type FC, useCallback } from "react";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleAccountSummaryStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { useHasPendingEventMutations } from "@web/ducks/events/mutations/useEventPending";

const TEMPORARY_ACCOUNT_MESSAGE = "Sign up to save changes";

export const PlannerAccountSummary: FC = () => {
  const { email } = useUser();

  if (!email) {
    return <TemporaryAccountSummary />;
  }

  return <AuthenticatedAccountSummary email={email} />;
};

const TemporaryAccountSummary: FC = () => {
  const { openModal } = useAuthModal();
  const accountLabel = "Temporary account";
  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  return (
    <div className="shrink-0 border-border-primary border-t px-4 py-2">
      <button
        aria-label={`${accountLabel}. ${TEMPORARY_ACCOUNT_MESSAGE}`}
        className="group flex w-full min-w-0 items-center gap-2 text-left text-text-light transition-colors duration-150 hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        onClick={handleOpenSignUp}
        title={TEMPORARY_ACCOUNT_MESSAGE}
        type="button"
      >
        <span className="flex size-5 shrink-0 items-center justify-center text-accent-primary">
          <InfoIcon aria-hidden="true" size={15} weight="bold" />
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate font-normal text-text-light text-xs leading-tight">
            {accountLabel}
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-text-light-inactive text-xs"
          >
            ·
          </span>
          <span className="shrink-0 font-medium text-accent-primary text-xs leading-tight transition-colors duration-150 group-hover:text-text-lighter">
            Sign up
          </span>
        </span>
      </button>
    </div>
  );
};

const AuthenticatedAccountSummary: FC<{ email: string }> = ({ email }) => {
  const { state } = useConnectGoogle();
  const accountLabel = email;
  const googleStatus = getGoogleAccountSummaryStatus(state);
  const hasPendingEvents = useHasPendingEventMutations();
  // While event mutations are in flight, replace the green "healthy" dot with
  // a spinner — but only when Google is idle (healthy or not connected).
  // Actionable and transitional Google states keep narrating their own status.
  const isGoogleIdle = googleStatus === null || googleStatus.isHealthy;
  const showEventSync = hasPendingEvents && isGoogleIdle;
  const syncStatus = showEventSync
    ? { isHealthy: false, isLoading: true, label: "Syncing changes…" }
    : googleStatus;

  return (
    <div
      className="flex w-full min-w-0 shrink-0 flex-col border-border-primary border-t px-4 py-2 text-text-light"
      title={accountLabel}
    >
      <span
        className="truncate font-normal text-text-light text-xs leading-tight"
        translate="no"
      >
        {accountLabel}
      </span>
      {syncStatus ? (
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-text-light-inactive leading-tight motion-safe:animate-account-sync-status-in">
          {syncStatus.isHealthy ? (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-status-success"
            />
          ) : null}
          {syncStatus.isLoading ? (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 animate-spin rounded-full border border-text-light-inactive/40 border-t-text-lighter motion-reduce:animate-none"
            />
          ) : null}
          <span className="truncate">{syncStatus.label}</span>
        </span>
      ) : null}
    </div>
  );
};

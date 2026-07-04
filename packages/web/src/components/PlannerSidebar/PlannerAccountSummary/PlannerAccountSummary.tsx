import { InfoIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { type FC, useCallback } from "react";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getGoogleAccountSummaryStatus } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";

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

const SYNC_STATUS_VARIANT_CLASSNAME: Record<
  NonNullable<ReturnType<typeof getGoogleAccountSummaryStatus>>["variant"],
  string
> = {
  syncing: "c-sync-text-wave",
  healthy: "text-text-light",
  warning: "text-status-warning",
  error: "text-status-error",
};

const AuthenticatedAccountSummary: FC<{ email: string }> = ({ email }) => {
  const { state, onRepairGoogle, onOpenGoogleAuth } = useConnectGoogle();
  const accountLabel = email;
  const syncStatus = getGoogleAccountSummaryStatus(state, {
    onRepairGoogle,
    onOpenGoogleAuth,
  });

  const emailClassName = classNames(
    "truncate font-normal text-xs leading-tight",
    syncStatus
      ? SYNC_STATUS_VARIANT_CLASSNAME[syncStatus.variant]
      : "text-text-light",
  );

  return (
    <div className="flex w-full min-w-0 shrink-0 items-center border-border-primary border-t px-4 py-2 text-text-light">
      {syncStatus ? (
        <Tooltip interactive={!!syncStatus.action}>
          <TooltipTrigger asChild>
            {syncStatus.action ? (
              <button
                className={classNames(
                  emailClassName,
                  "min-w-0 appearance-none border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
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
                  "min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
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
                className="c-focus-ring self-start rounded bg-accent-primary px-2 py-1 font-medium text-text-dark text-xs hover:brightness-110"
                onClick={syncStatus.action.onClick}
                type="button"
              >
                {syncStatus.action.label}
              </button>
            ) : null}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className={emailClassName} translate="no">
          {accountLabel}
        </span>
      )}
      {syncStatus ? (
        <span aria-live="polite" className="sr-only" role="status">
          {syncStatus.tooltip}
        </span>
      ) : null}
    </div>
  );
};

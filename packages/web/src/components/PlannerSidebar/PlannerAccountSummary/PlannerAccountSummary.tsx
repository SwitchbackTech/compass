import { InfoIcon } from "@phosphor-icons/react";
import { type FC, useCallback } from "react";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

const TEMPORARY_ACCOUNT_MESSAGE = "Sign up to save your changes";

export const PlannerAccountSummary: FC = () => {
  const { email } = useUser();
  const { openModal } = useAuthModal();
  const isTemporaryAccount = !email;
  const accountLabel = email ?? "Temporary account";
  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  return (
    <div
      className="flex min-w-0 items-center gap-2 border-border-primary border-b px-1 pb-3 text-text-light-inactive"
      title={accountLabel}
    >
      <span
        className="min-w-0 flex-1 truncate text-[11px] leading-tight"
        translate="no"
      >
        {accountLabel}
      </span>

      {isTemporaryAccount ? (
        <TooltipWrapper
          description={TEMPORARY_ACCOUNT_MESSAGE}
          onClick={handleOpenSignUp}
        >
          <button
            aria-label="Temporary account info"
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-default text-text-light-inactive transition-colors hover:bg-bg-secondary hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            type="button"
          >
            <InfoIcon aria-hidden="true" size={14} />
          </button>
        </TooltipWrapper>
      ) : null}
    </div>
  );
};

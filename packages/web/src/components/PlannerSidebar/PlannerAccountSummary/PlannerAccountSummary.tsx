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
      className="flex min-w-0 items-center gap-1.5 text-text-light-inactive text-xs"
      title={accountLabel}
    >
      <span className="min-w-0 truncate" translate="no">
        {accountLabel}
      </span>

      {isTemporaryAccount ? (
        <TooltipWrapper
          description={TEMPORARY_ACCOUNT_MESSAGE}
          onClick={handleOpenSignUp}
        >
          <button
            aria-label="Temporary account info"
            className="inline-flex cursor-pointer items-center rounded-default p-0 text-text-light-inactive transition-colors hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            type="button"
          >
            <InfoIcon aria-hidden="true" size={14} />
          </button>
        </TooltipWrapper>
      ) : null}
    </div>
  );
};

import { InfoIcon } from "@phosphor-icons/react";
import { type FC, useCallback } from "react";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const TEMPORARY_ACCOUNT_MESSAGE = "Sign up to save changes";

export const PlannerAccountSummary: FC = () => {
  const { email } = useUser();
  const { openModal } = useAuthModal();
  const isTemporaryAccount = !email;
  const accountLabel = email ?? "Temporary account";
  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  if (isTemporaryAccount) {
    return (
      <div className="border-border-primary border-b px-1 pb-3">
        <button
          aria-label={`${accountLabel}. ${TEMPORARY_ACCOUNT_MESSAGE}`}
          className="group flex w-full min-w-0 items-center gap-2 py-1 text-left text-text-light transition-colors duration-150 hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
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
  }

  return (
    <div
      className="flex min-w-0 items-center gap-2 border-border-primary border-b px-1 pb-3 text-text-light"
      title={accountLabel}
    >
      <span
        className="min-w-0 flex-1 truncate font-normal text-text-light text-xs leading-tight"
        translate="no"
      >
        {accountLabel}
      </span>
    </div>
  );
};

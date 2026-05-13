import { InfoIcon } from "@phosphor-icons/react";
import { type FC, useCallback } from "react";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const TEMPORARY_ACCOUNT_MESSAGE = "Sign up to save your changes";

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
          className="group flex w-full min-w-0 items-start gap-2 py-1 text-left text-text-light transition-colors duration-150 hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          onClick={handleOpenSignUp}
          title={TEMPORARY_ACCOUNT_MESSAGE}
          type="button"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-accent-primary">
            <InfoIcon aria-hidden="true" size={15} weight="bold" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="block truncate font-medium text-[11px] text-text-lighter leading-tight">
              {accountLabel}
            </span>
            <span className="block truncate text-[10px] text-text-light leading-tight transition-colors duration-150 group-hover:text-text-lighter">
              {TEMPORARY_ACCOUNT_MESSAGE}
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
        className="min-w-0 flex-1 truncate font-medium text-[11px] text-text-lighter leading-tight"
        translate="no"
      >
        {accountLabel}
      </span>
    </div>
  );
};

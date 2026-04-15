import { InfoIcon } from "@phosphor-icons/react";
import { type FC, useCallback } from "react";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

const TEMPORARY_ACCOUNT_MESSAGE = "Sign up to save your changes";

export const SubCalendarList: FC = () => {
  const { email } = useUser();
  const { openModal } = useAuthModal();
  const isTemporaryAccount = !email;
  const headingText = email ?? "Temporary account";
  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  return (
    <>
      <div
        className="from-fg-primary-dark to-fg-primary h-[2px] w-full bg-linear-to-r"
        role="separator"
        title="right sidebar divider"
      />
      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-text-light text">{headingText}</span>
          {isTemporaryAccount ? (
            <TooltipWrapper
              description={TEMPORARY_ACCOUNT_MESSAGE}
              onClick={handleOpenSignUp}
            >
              <button
                aria-label="Temporary account info"
                className="text-text-darkPlaceholder inline-flex cursor-pointer items-center p-0"
                type="button"
              >
                <InfoIcon aria-hidden="true" size={14} />
              </button>
            </TooltipWrapper>
          ) : null}
        </div>
        {!isTemporaryAccount ? (
          <ul className="pl-[10px]">
            <label className="flex items-center">
              <input
                checked={true}
                className="mr-1.5"
                disabled={true}
                type="checkbox"
              />
              <span className="text-text-light text-base">primary</span>
            </label>
          </ul>
        ) : null}
      </div>
    </>
  );
};

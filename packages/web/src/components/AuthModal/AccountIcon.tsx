import { FC } from "react";
import { UserCircleDashedIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/hooks/session/useSession";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useAuthFeatureFlag } from "./hooks/useAuthFeatureFlag";
import { useAuthModal } from "./hooks/useAuthModal";

/**
 * Account icon button for triggering the auth modal
 *
 */
export const AccountIcon: FC = () => {
  const { authenticated } = useSession();
  const isEnabled = useAuthFeatureFlag();
  const { openModal } = useAuthModal();

  // Don't show if user is already authenticated or feature is disabled
  if (authenticated || !isEnabled) {
    return null;
  }

  const handleClick = () => {
    openModal("signIn");
  };

  const tipDescription = authenticated ? "You're logged in" : "Log in";

  return (
    <TooltipWrapper description={tipDescription} onClick={handleClick}>
      {authenticated ? (
        <UserCircleIcon
          size={24}
          className="cursor-pointer text-white/70 transition-colors hover:text-white"
          aria-label="Your account"
        />
      ) : (
        <UserCircleDashedIcon
          size={24}
          className="cursor-pointer text-white/70 transition-colors hover:text-white"
          aria-label="Log in"
        />
      )}
    </TooltipWrapper>
  );
};

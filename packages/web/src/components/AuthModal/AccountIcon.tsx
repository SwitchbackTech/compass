import { FC } from "react";
import { UserIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/hooks/session/useSession";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useAuthFeatureFlag } from "./hooks/useAuthFeatureFlag";
import { useAuthModal } from "./hooks/useAuthModal";

/**
 * Account icon button for triggering the auth modal
 *
 * Only renders when:
 * - User is not authenticated
 * - Feature flag ?enableAuth=true is present in URL
 *
 * Clicking opens the auth modal with sign-in view
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

  return (
    <TooltipWrapper description="Sign in" onClick={handleClick}>
      <UserIcon
        size={24}
        className="cursor-pointer text-white/70 transition-colors hover:text-white"
        aria-label="Sign in"
      />
    </TooltipWrapper>
  );
};

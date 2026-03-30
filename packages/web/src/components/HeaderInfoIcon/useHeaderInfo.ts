import { useCallback, useSyncExternalStore } from "react";
import { useConnectGoogle } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle";
import { type GoogleUiConfig } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle.types";
import { useSession } from "@web/auth/hooks/session/useSession";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/state/auth.state.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const ANONYMOUS_SIGN_UP_TOOLTIP = "Sign up to save your changes.";

interface HeaderInfo {
  isAnonymousSignUpPrompt: boolean;
  isRepairing: boolean;
  sidebarStatus: GoogleUiConfig["sidebarStatus"];
}

export const useHeaderInfo = (): HeaderInfo => {
  const { authenticated } = useSession();
  const { openModal } = useAuthModal();
  const googleStatus = useConnectGoogle();
  const shouldPromptSignUp = useSyncExternalStore(
    subscribeToAuthState,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
    shouldShowAnonymousCalendarChangeSignUpPrompt,
  );

  const handleOpenSignUp = useCallback(() => {
    openModal("signUp");
  }, [openModal]);

  if (!authenticated && shouldPromptSignUp) {
    return {
      isAnonymousSignUpPrompt: true,
      isRepairing: false,
      sidebarStatus: {
        iconColor: "warning" as const,
        icon: "DotIcon" as const,
        isDisabled: false,
        onSelect: handleOpenSignUp,
        tooltip: ANONYMOUS_SIGN_UP_TOOLTIP,
      },
    };
  }

  return {
    isAnonymousSignUpPrompt: false,
    ...googleStatus,
  };
};

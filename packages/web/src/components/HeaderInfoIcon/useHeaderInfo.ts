import { useCallback, useSyncExternalStore } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  type GoogleUiConfig,
  type UseConnectGoogleResult,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { useSession } from "@web/auth/session/useSession";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/state/auth.state.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const ANONYMOUS_SIGN_UP_TOOLTIP = "Sign up to save your changes.";

interface HeaderInfo {
  isAnonymousSignUpPrompt: boolean;
  isRepairing: UseConnectGoogleResult["isRepairing"];
  sidebarStatus: GoogleUiConfig["sidebarStatus"];
  syncTooltip: null | string;
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
        isDisabled: false,
        onSelect: handleOpenSignUp,
        tooltip: ANONYMOUS_SIGN_UP_TOOLTIP,
      },
      syncTooltip: null,
    };
  }

  const syncTooltip =
    googleStatus.state === "repairing"
      ? "Repairing Google Calendar in the background."
      : googleStatus.state === "IMPORTING"
        ? "Syncing Google Calendar in the background."
        : null;

  return {
    isAnonymousSignUpPrompt: false,
    ...googleStatus,
    syncTooltip,
  };
};

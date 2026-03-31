import { useCallback, useSyncExternalStore } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type GoogleUiConfig } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { useSession } from "@web/auth/session/useSession";
import {
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
} from "@web/auth/state/auth.state.util";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
  type GoogleSyncIndicator,
  selectGoogleSyncIndicator,
} from "@web/ducks/events/selectors/sync.selector";
import { useAppSelector } from "@web/store/store.hooks";

const ANONYMOUS_SIGN_UP_TOOLTIP = "Sign up to save your changes.";

interface HeaderInfo {
  isAnonymousSignUpPrompt: boolean;
  isRepairing: boolean;
  sidebarStatus: GoogleUiConfig["sidebarStatus"];
  syncIndicator: GoogleSyncIndicator;
}

export const useHeaderInfo = (): HeaderInfo => {
  const { authenticated } = useSession();
  const { openModal } = useAuthModal();
  const googleStatus = useConnectGoogle();
  const syncIndicator = useAppSelector(selectGoogleSyncIndicator);
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
      syncIndicator,
    };
  }

  return {
    isAnonymousSignUpPrompt: false,
    ...googleStatus,
    syncIndicator,
  };
};

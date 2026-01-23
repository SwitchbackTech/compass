import { useEffect, useState } from "react";
import { useSession } from "@web/auth/hooks/useSession";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboarding.storage.util";

interface UseAuthPromptProps {
  tasks: Array<{ id: string }>;
  hasNavigatedDates: boolean;
  showOnboardingOverlay: boolean;
}

interface UseAuthPromptReturn {
  showAuthPrompt: boolean;
  dismissAuthPrompt: () => void;
}

/**
 * Hook to manage the auth prompt visibility
 * Shows prompt after user interactions (creating tasks, using cmd+k, navigating dates)
 * Only shows for unauthenticated users who haven't dismissed it
 */
export function useAuthPrompt({
  tasks,
  hasNavigatedDates,
  showOnboardingOverlay,
}: UseAuthPromptProps): UseAuthPromptReturn {
  const { authenticated } = useSession();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const AUTH_PROMPT_DELAY = 2000;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authenticated) return;

    const { isAuthPromptDismissed } = getOnboardingProgress();
    if (isAuthPromptDismissed) return;

    // Show auth prompt if user has:
    // - Created 2+ tasks, OR
    // - Navigated between dates
    const shouldShow = tasks.length >= 2 || hasNavigatedDates;

    if (shouldShow && !showOnboardingOverlay) {
      // Delay showing auth prompt to avoid overwhelming user
      const timer = setTimeout(() => {
        setShowAuthPrompt(true);
      }, AUTH_PROMPT_DELAY);

      return () => clearTimeout(timer);
    }
  }, [authenticated, tasks.length, hasNavigatedDates, showOnboardingOverlay]);

  const dismissAuthPrompt = () => {
    updateOnboardingProgress({ isAuthPromptDismissed: true });
    setShowAuthPrompt(false);
  };

  return {
    showAuthPrompt,
    dismissAuthPrompt,
  };
}

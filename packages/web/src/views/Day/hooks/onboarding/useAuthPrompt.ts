import { useEffect, useRef, useState } from "react";
import { useSession } from "@web/common/hooks/useSession";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { useAppSelector } from "@web/store/store.hooks";
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
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [hasUsedCmdPalette, setHasUsedCmdPalette] = useState(false);
  const prevCmdPaletteOpen = useRef(isCmdPaletteOpen);

  // Track if command palette has been used (opened and then closed)
  useEffect(() => {
    if (prevCmdPaletteOpen.current && !isCmdPaletteOpen) {
      setHasUsedCmdPalette(true);
    }
    prevCmdPaletteOpen.current = isCmdPaletteOpen;
  }, [isCmdPaletteOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authenticated) return;

    const progress = getOnboardingProgress();
    if (progress.isAuthDismissed) return;

    // Show auth prompt if user has:
    // - Created 2+ tasks, OR
    // - Used cmd+k palette (opened and closed), OR
    // - Navigated between dates
    const shouldShow =
      tasks.length >= 2 || hasNavigatedDates || hasUsedCmdPalette;

    if (shouldShow && !showOnboardingOverlay) {
      // Delay showing auth prompt to avoid overwhelming user
      const timer = setTimeout(() => {
        setShowAuthPrompt(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [
    authenticated,
    tasks.length,
    hasNavigatedDates,
    hasUsedCmdPalette,
    showOnboardingOverlay,
  ]);

  const dismissAuthPrompt = () => {
    updateOnboardingProgress({ isAuthDismissed: true });
    setShowAuthPrompt(false);
  };

  return {
    showAuthPrompt,
    dismissAuthPrompt,
  };
}

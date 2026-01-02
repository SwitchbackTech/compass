import { useCallback, useEffect, useState } from "react";
import { useSession } from "@web/common/hooks/useSession";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboardingStorage.util";

interface UseCmdPaletteTutorialProps {
  showOnboardingOverlay: boolean;
}

interface UseCmdPaletteTutorialReturn {
  showCmdPaletteTutorial: boolean;
  dismissCmdPaletteTutorial: () => void;
  markCmdPaletteUsed: () => void;
}

/**
 * Hook to manage the cmd palette tutorial visibility
 * Shows tutorial after onboarding overlay is dismissed for unauthenticated users
 * Automatically marks tutorial as seen when cmd palette is opened
 */
export function useCmdPaletteTutorial({
  showOnboardingOverlay,
}: UseCmdPaletteTutorialProps): UseCmdPaletteTutorialReturn {
  const { authenticated } = useSession();
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);
  const [showCmdPaletteTutorial, setShowCmdPaletteTutorial] = useState(false);

  const markCmdPaletteUsed = useCallback(() => {
    updateOnboardingProgress({ isSeen: true });
    setShowCmdPaletteTutorial(false);
  }, []);

  // Check if user has seen cmd palette tutorial
  useEffect(() => {
    if (typeof window === "undefined") return;

    const progress = getOnboardingProgress();
    const hasSeenTutorial = progress.isSeen;

    // Show tutorial after onboarding overlay is dismissed, for unauthenticated users
    if (!hasSeenTutorial && !authenticated && !showOnboardingOverlay) {
      // Small delay to show tutorial after overlay
      const timer = setTimeout(() => {
        setShowCmdPaletteTutorial(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [authenticated, showOnboardingOverlay]);

  // Track cmd palette usage
  useEffect(() => {
    if (isCmdPaletteOpen && showCmdPaletteTutorial) {
      markCmdPaletteUsed();
    }
  }, [isCmdPaletteOpen, showCmdPaletteTutorial, markCmdPaletteUsed]);

  const dismissCmdPaletteTutorial = () => {
    setShowCmdPaletteTutorial(false);
  };

  return {
    showCmdPaletteTutorial,
    dismissCmdPaletteTutorial,
    markCmdPaletteUsed,
  };
}

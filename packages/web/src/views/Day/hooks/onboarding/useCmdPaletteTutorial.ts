import { useEffect, useState } from "react";
import { useSession } from "@web/auth/hooks/useSession";

interface UseCmdPaletteTutorialProps {
  showOnboardingOverlay: boolean;
}

interface UseCmdPaletteTutorialReturn {
  showCmdPaletteTutorial: boolean;
  dismissCmdPaletteTutorial: () => void;
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
  const [showCmdPaletteTutorial, setShowCmdPaletteTutorial] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Show tutorial after onboarding overlay is dismissed, for unauthenticated users
    if (!authenticated && !showOnboardingOverlay) {
      // Small delay to show tutorial after overlay
      const timer = setTimeout(() => {
        setShowCmdPaletteTutorial(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [authenticated, showOnboardingOverlay]);

  const dismissCmdPaletteTutorial = () => {
    setShowCmdPaletteTutorial(false);
  };

  return {
    showCmdPaletteTutorial,
    dismissCmdPaletteTutorial,
  };
}

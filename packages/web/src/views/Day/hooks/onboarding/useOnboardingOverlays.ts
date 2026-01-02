import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useSession } from "@web/common/hooks/useSession";
import { selectIsCmdPaletteOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { useAppSelector } from "@web/store/store.hooks";

interface UseOnboardingOverlaysProps {
  tasks: Array<{ id: string }>;
  hasNavigatedDates: boolean;
}

interface UseOnboardingOverlaysReturn {
  showOnboardingOverlay: boolean;
  showCmdPaletteTutorial: boolean;
  showAuthPrompt: boolean;
  dismissOnboardingOverlay: () => void;
  dismissCmdPaletteTutorial: () => void;
  dismissAuthPrompt: () => void;
  markCmdPaletteUsed: () => void;
}

export function useOnboardingOverlays({
  tasks,
  hasNavigatedDates,
}: UseOnboardingOverlaysProps): UseOnboardingOverlaysReturn {
  const { authenticated } = useSession();
  const isCmdPaletteOpen = useAppSelector(selectIsCmdPaletteOpen);

  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);
  const [showCmdPaletteTutorial, setShowCmdPaletteTutorial] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Check if user has seen onboarding overlay
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenOverlay =
      localStorage.getItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN) === "true";

    // Show overlay for unauthenticated users or first-time authenticated users
    if (!hasSeenOverlay && !authenticated) {
      setShowOnboardingOverlay(true);
    }
  }, [authenticated]);

  // Check if user has seen cmd palette tutorial
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenTutorial =
      localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN) === "true";

    // Show tutorial after onboarding overlay is dismissed, for unauthenticated users
    if (!hasSeenTutorial && !authenticated && !showOnboardingOverlay) {
      // Small delay to show tutorial after overlay
      const timer = setTimeout(() => {
        setShowCmdPaletteTutorial(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [authenticated, showOnboardingOverlay]);

  const markCmdPaletteUsed = () => {
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_TUTORIAL_SEEN, "true");
    setShowCmdPaletteTutorial(false);
  };

  // Track cmd palette usage
  useEffect(() => {
    if (isCmdPaletteOpen && showCmdPaletteTutorial) {
      markCmdPaletteUsed();
    }
  }, [isCmdPaletteOpen, showCmdPaletteTutorial]);

  // Show auth prompt after user interactions
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authenticated) return;

    const authPromptDismissed =
      localStorage.getItem(STORAGE_KEYS.AUTH_PROMPT_DISMISSED) === "true";

    if (authPromptDismissed) return;

    // Show auth prompt if user has:
    // - Created 2+ tasks, OR
    // - Used cmd+k palette, OR
    // - Navigated between dates
    const shouldShow =
      tasks.length >= 2 || hasNavigatedDates || isCmdPaletteOpen;

    if (shouldShow && !showOnboardingOverlay && !showCmdPaletteTutorial) {
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
    isCmdPaletteOpen,
    showOnboardingOverlay,
    showCmdPaletteTutorial,
  ]);

  const dismissOnboardingOverlay = () => {
    setShowOnboardingOverlay(false);
  };

  const dismissCmdPaletteTutorial = () => {
    setShowCmdPaletteTutorial(false);
  };

  const dismissAuthPrompt = () => {
    setShowAuthPrompt(false);
  };

  return {
    showOnboardingOverlay,
    showCmdPaletteTutorial,
    showAuthPrompt,
    dismissOnboardingOverlay,
    dismissCmdPaletteTutorial,
    dismissAuthPrompt,
    markCmdPaletteUsed,
  };
}

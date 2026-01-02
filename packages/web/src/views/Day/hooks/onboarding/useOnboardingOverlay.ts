import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useSession } from "@web/common/hooks/useSession";

interface UseOnboardingOverlayReturn {
  showOnboardingOverlay: boolean;
  dismissOnboardingOverlay: () => void;
}

/**
 * Hook to manage the onboarding overlay visibility
 * Shows overlay for unauthenticated users who haven't seen it before
 */
export function useOnboardingOverlay(): UseOnboardingOverlayReturn {
  const { authenticated } = useSession();
  const [showOnboardingOverlay, setShowOnboardingOverlay] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenOverlay =
      localStorage.getItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN) === "true";

    // Show overlay for unauthenticated users who haven't seen it
    if (!hasSeenOverlay && !authenticated) {
      setShowOnboardingOverlay(true);
    }
  }, [authenticated]);

  const dismissOnboardingOverlay = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN, "true");
    setShowOnboardingOverlay(false);
  };

  return {
    showOnboardingOverlay,
    dismissOnboardingOverlay,
  };
}

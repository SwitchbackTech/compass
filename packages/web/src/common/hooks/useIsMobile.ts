import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = "(max-width: 768px)";

/**
 * Get initial mobile state synchronously
 * This prevents unnecessary API calls on mobile devices during first render
 */
const getInitialMobileState = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(MOBILE_BREAKPOINT).matches;
};

/**
 * Hook to detect if the current viewport is mobile-sized
 * Uses window.matchMedia with a 768px breakpoint
 * @returns boolean indicating if viewport is mobile-sized
 */
export const useIsMobile = (): boolean => {
  // Initialize synchronously to prevent unnecessary provider mounts on mobile
  const [isMobile, setIsMobile] = useState<boolean>(getInitialMobileState);

  useEffect(() => {
    // Create media query object once
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    // Update state if it changed (shouldn't happen on first render, but ensures consistency)
    setIsMobile(mediaQuery.matches);

    // Create listener
    const handleChange = () => {
      setIsMobile(mediaQuery.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
};

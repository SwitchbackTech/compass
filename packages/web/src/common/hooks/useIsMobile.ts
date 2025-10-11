import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = "(max-width: 768px)";

/**
 * Hook to detect if the current viewport is mobile-sized
 * Uses window.matchMedia with a 768px breakpoint
 * @returns boolean indicating if viewport is mobile-sized
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Create media query object once
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    // Check initial state
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

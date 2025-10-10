import { useEffect, useState } from "react";

/**
 * Hook to detect if the current viewport is mobile-sized
 * Uses window.matchMedia with a 768px breakpoint
 * @returns boolean indicating if viewport is mobile-sized
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const mediaQuery = window.matchMedia("(max-width: 768px)");
      setIsMobile(mediaQuery.matches);
    };

    // Check initial state
    checkIsMobile();

    // Create media query listener
    const mediaQuery = window.matchMedia("(max-width: 768px)");
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

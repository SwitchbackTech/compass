import { useCallback, useEffect, useState } from "react";

// Tailwind xl breakpoint
const XL_BREAKPOINT = 1280;

/**
 * Hook to manage collapsible sidebar state with responsive behavior.
 * - Auto-collapses when screen is below xl breakpoint (1280px)
 * - Auto-expands when screen is at or above xl breakpoint
 * - Provides toggle function for manual control
 */
export function useSidebarState() {
  const [isOpen, setIsOpen] = useState(
    () => window.innerWidth >= XL_BREAKPOINT,
  );

  // Auto-collapse/expand sidebar based on screen width
  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${XL_BREAKPOINT}px)`);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsOpen(e.matches);
    };

    // Check initial state
    handleChange(mediaQuery);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isSidebarOpen: isOpen,
    toggleSidebar: toggle,
  };
}

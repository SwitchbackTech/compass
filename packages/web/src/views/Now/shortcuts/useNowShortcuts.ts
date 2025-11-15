import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { isEditable } from "@web/views/Day/util/shortcut.util";

/**
 * Hook to handle keyboard shortcuts for the Now view
 */
export function useNowShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      const target = e.target as EventTarget | null;

      // Don't intercept when typing in inputs
      if (isEditable(target)) {
        return;
      }

      // Handle global navigation shortcuts
      switch (key) {
        case "1":
          e.preventDefault();
          navigate(ROOT_ROUTES.NOW);
          break;
        case "2":
          e.preventDefault();
          navigate(ROOT_ROUTES.DAY);
          break;
        case "3":
          e.preventDefault();
          // For now, navigate to root (week view not implemented yet)
          navigate(ROOT_ROUTES.ROOT);
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useFeatureFlags } from "@web/common/hooks/useFeatureFlags";
import { isEditable } from "../Today/util/shortcut.util";

export const useWeekShortcuts = () => {
  const navigate = useNavigate();
  const { isPlannerEnabled } = useFeatureFlags();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      const target = e.target as EventTarget | null;
      if (isEditable(target)) {
        return;
      }
      if (key === "1") {
        if (!isPlannerEnabled) return;
        e.preventDefault();
        navigate(ROOT_ROUTES.NOW);
      }
      if (key === "2") {
        e.preventDefault();
        navigate(ROOT_ROUTES.DAY);
      }
    },
    [isPlannerEnabled, navigate],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};

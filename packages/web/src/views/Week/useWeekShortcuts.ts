import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { isEditable } from "../Day/util/day.shortcut.util";

export const useWeekShortcuts = () => {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      const target = e.target as EventTarget | null;
      if (isEditable(target)) {
        return;
      }
      if (key === "1") {
        e.preventDefault();
        navigate(ROOT_ROUTES.NOW);
      }
      if (key === "2") {
        e.preventDefault();
        navigate(ROOT_ROUTES.DAY);
      }
    },
    [navigate],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};

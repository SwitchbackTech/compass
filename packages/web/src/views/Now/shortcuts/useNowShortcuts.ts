import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { Task } from "@web/common/types/task.types";
import { isEditable } from "@web/views/Day/util/day.shortcut.util";
import { NowViewShortcutKey } from "@web/views/Now/shortcuts/now.shortcut.types";

interface Props {
  focusedTask?: Task | null;
  availableTasks?: Task[];
  onPreviousTask?: () => void;
  onNextTask?: () => void;
  onCompleteTask?: () => void;
}

/**
 * Hook to handle keyboard shortcuts for the Now view
 * Handles both global navigation shortcuts (1, 2, 3) and task-specific shortcuts (j, k)
 */
export function useNowShortcuts(props?: Props) {
  const navigate = useNavigate();
  const {
    focusedTask = null,
    availableTasks = [],
    onPreviousTask,
    onNextTask,
    onCompleteTask,
  } = props || {};

  // Define strongly-typed handler mapping
  const handlers: Record<NowViewShortcutKey, (e: KeyboardEvent) => void> =
    useMemo(
      () => ({
        // Global navigation shortcuts
        "1": (e) => {
          e.preventDefault();
          navigate(ROOT_ROUTES.NOW);
        },
        "2": (e) => {
          e.preventDefault();
          navigate(ROOT_ROUTES.DAY);
        },
        "3": (e) => {
          e.preventDefault();
          // Root route is currently the week view
          navigate(ROOT_ROUTES.ROOT);
        },

        // Task navigation shortcuts (only active when task props are provided)
        j: (e) => {
          e.preventDefault();
          onPreviousTask?.();
        },
        k: (e) => {
          e.preventDefault();
          onNextTask?.();
        },
        enter: (e) => {
          e.preventDefault();
          onCompleteTask?.();
        },
        escape: (e) => {
          e.preventDefault();
          navigate(ROOT_ROUTES.DAY);
        },
      }),
      [navigate, onPreviousTask, onNextTask, onCompleteTask],
    );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;

      // Don't intercept when typing in inputs
      if (isEditable(target)) {
        return;
      }

      // For task shortcuts (j, k), only handle if task props are provided and conditions are met
      const isTaskShortcut = key === "j" || key === "k" || key === "enter";
      if (isTaskShortcut) {
        if (!focusedTask || availableTasks.length === 0) {
          return;
        }
      }

      const handler = handlers[key as NowViewShortcutKey];
      if (handler) {
        handler(e);
      }
    },
    [handlers, focusedTask, availableTasks.length],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

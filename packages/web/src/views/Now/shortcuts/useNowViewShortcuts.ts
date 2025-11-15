import { useCallback, useEffect, useMemo } from "react";
import { Task } from "@web/views/Day/task.types";
import { isEditable } from "@web/views/Day/util/shortcut.util";
import { NowViewShortcutKey } from "@web/views/Now/shortcuts/now.shortcut.types";

interface Props {
  focusedTask: Task | null;
  availableTasks: Task[];
  onPreviousTask: () => void;
  onNextTask: () => void;
}

/**
 * Hook to handle keyboard shortcuts for task cycling in the Now view
 */
export function useNowViewShortcuts({
  focusedTask,
  availableTasks,
  onPreviousTask,
  onNextTask,
}: Props) {
  // Define strongly-typed handler mapping
  const handlers: Record<NowViewShortcutKey, (e: KeyboardEvent) => void> =
    useMemo(
      () => ({
        // Global shortcuts (handled in useNowShortcuts hook, but included in type)
        "1": () => {},
        "2": () => {},
        "3": () => {},

        // Navigation shortcuts
        j: (e) => {
          e.preventDefault();
          onPreviousTask();
        },
        k: (e) => {
          e.preventDefault();
          onNextTask();
        },
      }),
      [onPreviousTask, onNextTask],
    );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;

      // Don't intercept when typing in inputs
      if (isEditable(target)) {
        return;
      }

      // Only handle shortcuts if there's a focused task and available tasks
      if (!focusedTask || availableTasks.length === 0) {
        return;
      }

      // Use the handler mapping instead of switch statement
      // Handle case insensitive keys by normalizing to lowercase for most keys
      const normalizedKey =
        key === "escape"
          ? "Escape"
          : key === "enter"
            ? "Enter"
            : key === "delete"
              ? "Delete"
              : key;
      const handler = handlers[normalizedKey as NowViewShortcutKey];
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

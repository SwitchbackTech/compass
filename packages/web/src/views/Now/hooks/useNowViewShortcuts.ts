import { useCallback, useEffect, useMemo } from "react";
import { ShortcutKey } from "@web/views/Day/components/Shortcuts/types/shortcut.types";
import { Task } from "@web/views/Day/task.types";
import { isEditable } from "@web/views/Day/util/shortcut.util";

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
  // TODO change so that the keys are specific to the now view
  // Define strongly-typed handler mapping
  const handlers: Record<ShortcutKey, (e: KeyboardEvent) => void> = useMemo(
    () => ({
      // Global shortcuts (not handled in this hook)
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
      t: () => {},

      // Task shortcuts
      u: () => {},
      c: () => {},
      e: () => {},
      Delete: () => {},
      Enter: () => {},
      Escape: () => {},
      Esc: () => {},

      // Calendar shortcuts
      i: () => {},
      "↑": () => {},
      "↓": () => {},
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
      const handler = handlers[normalizedKey as ShortcutKey];
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

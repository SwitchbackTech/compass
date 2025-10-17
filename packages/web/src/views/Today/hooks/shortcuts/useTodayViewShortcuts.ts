import { useCallback, useEffect } from "react";
import { isEditable } from "../../util/shortcut.util";

export interface KeyboardShortcutsConfig {
  // Task management
  onAddTask?: () => void;
  onEditTask?: () => void;
  onCompleteTask?: () => void;
  onFocusTasks?: () => void;

  // Task navigation
  onPrevTask?: () => void;

  // General
  onEscape?: () => void;

  // Conditions
  isEditingTask?: boolean;
  hasFocusedTask?: boolean;
}

/**
 * Hook to handle keyboard shortcuts for the Today view
 */
export function useTodayViewShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onAddTask,
    onEditTask,
    onCompleteTask,
    onEscape,
    onFocusTasks,
    isEditingTask,
    hasFocusedTask,
  } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;

      // Don't intercept when typing in inputs (except for Escape)
      if (key !== "escape" && isEditable(target)) {
        return;
      }

      switch (key) {
        case "u":
          e.preventDefault();
          onFocusTasks?.();
          break;

        case "t":
          e.preventDefault();
          onAddTask?.();
          break;

        case "e":
          e.preventDefault();
          onEditTask?.();
          break;

        case "enter":
          if (hasFocusedTask && !isEditingTask) {
            const activeElement = document.activeElement as HTMLElement | null;
            const isTaskButton =
              activeElement?.getAttribute("role") === "checkbox" &&
              activeElement?.dataset?.taskId;

            // Let the task button handle Enter if it's focused
            if (!isTaskButton) {
              e.preventDefault();
              onCompleteTask?.();
            }
          }
          break;

        case "escape":
          e.preventDefault();
          onEscape?.();
          break;

        default:
          // No action for unhandled keys
          break;
      }
    },
    [
      onAddTask,
      onEditTask,
      onCompleteTask,
      onEscape,
      onFocusTasks,
      isEditingTask,
      hasFocusedTask,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

import { useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { isEditable, isFocusedOnTaskCheckbox } from "../../util/shortcut.util";

export interface KeyboardShortcutsConfig {
  // Task management
  onAddTask?: () => void;
  onEditTask?: () => void;
  onCompleteTask?: () => void;
  onDeleteTask?: () => void;
  onRestoreTask?: () => void;
  onFocusTasks?: () => void;

  // Task navigation
  onPrevTask?: () => void;

  // Day navigation
  onNextDay?: () => void;
  onPrevDay?: () => void;
  onGoToToday?: () => void;

  // General
  onEscape?: () => void;

  // Conditions
  isEditingTask?: boolean;
  hasFocusedTask?: boolean;
  undoToastId?: string | number | null;
}

/**
 * Hook to handle keyboard shortcuts for the Today view
 */
export function useTodayViewShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onAddTask,
    onEditTask,
    onCompleteTask,
    onDeleteTask,
    onRestoreTask,
    onEscape,
    onFocusTasks,
    onNextDay,
    onPrevDay,
    onGoToToday,
    isEditingTask,
    hasFocusedTask,
    undoToastId,
  } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;

      // Handle Meta+Z for undo (works on all platforms)
      if (e.metaKey && key === "z") {
        e.preventDefault();
        onRestoreTask?.();
        if (undoToastId) {
          toast.dismiss(undoToastId);
        }
        return;
      }

      // Don't intercept when typing in inputs (except for Escape)
      if (key !== "escape" && isEditable(target)) {
        return;
      }

      switch (key) {
        case "u":
          e.preventDefault();
          onFocusTasks?.();
          break;

        case "c":
          e.preventDefault();
          onAddTask?.();
          break;

        case "e":
          e.preventDefault();
          onEditTask?.();
          break;

        case "j":
          e.preventDefault();
          onPrevDay?.();
          break;

        case "k":
          e.preventDefault();
          onNextDay?.();
          break;

        case "t":
          e.preventDefault();
          onGoToToday?.();
          break;

        case "enter": {
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
        }

        case "delete": {
          // Don't handle Delete key if we're in an editable element
          if (isEditable(target)) {
            return;
          }

          // Only delete if focused on a task checkbox, not an input
          if (isFocusedOnTaskCheckbox()) {
            e.preventDefault();
            onDeleteTask?.();
          }
          break;
        }

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
      onDeleteTask,
      onRestoreTask,
      onEscape,
      onFocusTasks,
      onNextDay,
      onPrevDay,
      onGoToToday,
      isEditingTask,
      hasFocusedTask,
      undoToastId,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

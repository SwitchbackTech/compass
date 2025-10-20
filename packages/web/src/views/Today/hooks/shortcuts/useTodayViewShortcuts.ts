import { useCallback, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { ShortcutKey } from "../../components/Shortcuts/types/shortcut.types";
import { isEditable, isFocusedOnTaskCheckbox } from "../../util/shortcut.util";

interface KeyboardShortcutsConfig {
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
  onNavigateHome?: () => void;
  onNavigateNow?: () => void;
  onNavigateDay?: () => void;
  onNavigateWeek?: () => void;

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
    onNavigateNow,
    onNavigateWeek,
    onNextDay,
    onPrevDay,
    onGoToToday,
    isEditingTask,
    hasFocusedTask,
    undoToastId,
  } = config;

  // Define strongly-typed handler mapping
  const handlers: Record<ShortcutKey, (e: KeyboardEvent) => void> = useMemo(
    () => ({
      // Global shortcuts (not handled in this hook)
      "1": (e) => {
        e.preventDefault();
        onNavigateNow?.();
      },
      "2": () => {},
      "3": (e) => {
        e.preventDefault();
        onNavigateWeek?.();
      },

      // Navigation shortcuts
      j: (e) => {
        e.preventDefault();
        onPrevDay?.();
      },
      k: (e) => {
        e.preventDefault();
        onNextDay?.();
      },
      t: (e) => {
        e.preventDefault();
        onGoToToday?.();
      },

      // Task shortcuts
      u: (e) => {
        e.preventDefault();
        onFocusTasks?.();
      },
      c: (e) => {
        e.preventDefault();
        onAddTask?.();
      },
      e: (e) => {
        e.preventDefault();
        onEditTask?.();
      },
      Delete: (e) => {
        // Don't handle Delete key if we're in an editable element
        if (isEditable(e.target)) {
          return;
        }

        // Only delete if focused on a task checkbox, not an input
        if (isFocusedOnTaskCheckbox()) {
          e.preventDefault();
          onDeleteTask?.();
        }
      },
      Enter: (e) => {
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
      },
      Escape: (e) => {
        e.preventDefault();
        onEscape?.();
      },
      Esc: (e) => {
        e.preventDefault();
        onEscape?.();
      },

      // Calendar shortcuts (not handled in this hook)
      i: () => {},
      "↑": () => {},
      "↓": () => {},
    }),
    [
      onAddTask,
      onEditTask,
      onCompleteTask,
      onDeleteTask,
      onEscape,
      onFocusTasks,
      onNextDay,
      onPrevDay,
      onGoToToday,
      isEditingTask,
      hasFocusedTask,
    ],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;

      // Handle Cmd+Z undo shortcut separately
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
    [handlers, onRestoreTask, undoToastId],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

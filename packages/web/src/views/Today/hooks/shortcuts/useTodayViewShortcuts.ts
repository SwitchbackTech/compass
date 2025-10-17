import { useCallback, useEffect } from "react";

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
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");

      // Don't intercept when typing in inputs (except for Escape)
      if (isEditableTarget && e.key !== "Escape") {
        return;
      }

      // Task management shortcuts
      if (key === "u") {
        e.preventDefault();
        onFocusTasks?.();
        return;
      }

      if (key === "t") {
        e.preventDefault();
        onAddTask?.();
        return;
      }

      if (key === "e") {
        e.preventDefault();
        onEditTask?.();
        return;
      }

      // Task completion with Enter
      if (e.key === "Enter" && hasFocusedTask && !isEditingTask) {
        const activeElement = document.activeElement as HTMLElement | null;
        const isTaskButton =
          activeElement?.getAttribute("role") === "checkbox" &&
          activeElement?.dataset?.taskId;

        // Let the task button handle Enter if it's focused
        if (!isTaskButton) {
          e.preventDefault();
          onCompleteTask?.();
          return;
        }
      }

      // Escape handling
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
        return;
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

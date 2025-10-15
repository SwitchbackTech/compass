import { useCallback, useEffect } from "react";

export interface KeyboardShortcutsConfig {
  // Task management
  onAddTask?: () => void;
  onEditTask?: () => void;
  onCompleteTask?: () => void;
  onFocusTasks?: () => void;

  // Task navigation
  onNextTask?: () => void;
  onPrevTask?: () => void;

  // General
  onEscape?: () => void;

  // Conditions
  isAddingTask?: boolean;
  isEditingTask?: boolean;
  hasFocusedTask?: boolean;
  isInInput?: boolean;
}

/**
 * Hook to handle keyboard shortcuts for the Today view
 */
export function useTodayViewShortcuts(config: KeyboardShortcutsConfig) {
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
      if (key === "t" && !config.isAddingTask && !config.isInInput) {
        e.preventDefault();
        config.onAddTask?.();
        return;
      }

      if (key === "e" && !config.isInInput && config.hasFocusedTask) {
        e.preventDefault();
        config.onEditTask?.();
        return;
      }

      if (key === "u" && !config.isInInput) {
        e.preventDefault();
        config.onFocusTasks?.();
        return;
      }

      // Task navigation
      if (key === "j" && config.hasFocusedTask && !config.isEditingTask) {
        e.preventDefault();
        config.onNextTask?.();
        return;
      }

      if (key === "k" && config.hasFocusedTask && !config.isEditingTask) {
        e.preventDefault();
        config.onPrevTask?.();
        return;
      }

      // Task completion with Enter
      if (e.key === "Enter" && config.hasFocusedTask && !config.isEditingTask) {
        const activeElement = document.activeElement as HTMLElement | null;
        const isTaskButton =
          activeElement?.getAttribute("role") === "checkbox" &&
          activeElement?.dataset?.taskId;

        // Let the task button handle Enter if it's focused
        if (!isTaskButton) {
          e.preventDefault();
          config.onCompleteTask?.();
          return;
        }
      }

      // Escape handling
      if (e.key === "Escape") {
        e.preventDefault();
        config.onEscape?.();
        return;
      }
    },
    [config],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

import { useCallback, useEffect } from "react";

export interface KeyboardShortcutsConfig {
  // Task management
  onAddTask?: () => void;
  onEditTask?: () => void;
  onCompleteTask?: () => void;
  onFocusTasks?: () => void;
  onFocusCalendar?: () => void;

  // Task navigation
  onNextTask?: () => void;
  onPrevTask?: () => void;

  // Calendar event management
  onEditEvent?: () => void;
  onDeleteEvent?: () => void;
  onMoveEventUp?: () => void;
  onMoveEventDown?: () => void;
  onClearFocus?: () => void;

  // General
  onEscape?: () => void;
  onShowShortcuts?: () => void;

  // Conditions
  isAddingTask?: boolean;
  isEditingTask?: boolean;
  hasTasks?: boolean;
  hasFocusedTask?: boolean;
  hasFocusedEvent?: boolean;
  isInInput?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");

      // Don't intercept when typing in inputs (except for Escape and ?)
      if (isEditableTarget) {
        if (
          e.key !== "Escape" &&
          e.key !== "?" &&
          !(e.key === "/" && e.shiftKey)
        )
          return;
      }

      // Shortcuts help overlay
      if (
        (e.key === "?" && !e.ctrlKey && !e.metaKey) ||
        (e.key === "/" && e.shiftKey)
      ) {
        e.preventDefault();
        config.onShowShortcuts?.();
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

      if (key === "c" && !config.isInInput) {
        e.preventDefault();
        config.onFocusCalendar?.();
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

      // Calendar event shortcuts
      if (key === "e" && !config.isInInput && config.hasFocusedEvent) {
        e.preventDefault();
        config.onEditEvent?.();
        return;
      }

      if (key === "delete" && config.hasFocusedEvent) {
        e.preventDefault();
        config.onDeleteEvent?.();
        return;
      }

      if (key === "arrowup" && e.shiftKey && config.hasFocusedEvent) {
        e.preventDefault();
        config.onMoveEventUp?.();
        return;
      }

      if (key === "arrowdown" && e.shiftKey && config.hasFocusedEvent) {
        e.preventDefault();
        config.onMoveEventDown?.();
        return;
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

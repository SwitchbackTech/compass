import { useCallback, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { DayViewShortcutKey } from "@web/views/Day/components/Shortcuts/day.shortcut.types";
import {
  getFocusedTaskId,
  isEditable,
  isFocusedOnTaskCheckbox,
  isFocusedWithinTask,
} from "../../util/day.shortcut.util";

interface KeyboardShortcutsConfig {
  // Task management
  onAddTask?: () => void;
  onEditTask?: () => void;
  onCompleteTask?: () => void;
  onDeleteTask?: () => void;
  onRestoreTask?: () => void;
  onFocusTasks?: () => void;

  // Task migration
  onMigrateTask?: (taskId: string, direction: "forward" | "backward") => void;

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

  // Agenda navigation
  onFocusAgenda?: () => void;

  // Event undo
  onRestoreEvent?: () => void;

  // Conditions
  isEditingTask?: boolean;
  hasFocusedTask?: boolean;
  undoToastId?: string | number | null;
  eventUndoToastId?: string | number | null;
}

/**
 * Hook to handle keyboard shortcuts for the Today view
 */
export function useDayViewShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onAddTask,
    onEditTask,
    onCompleteTask,
    onDeleteTask,
    onRestoreTask,
    onRestoreEvent,
    onMigrateTask,
    onEscape,
    onFocusTasks,
    onNavigateNow,
    onNavigateWeek,
    onNextDay,
    onPrevDay,
    onGoToToday,
    onFocusAgenda,
    isEditingTask,
    hasFocusedTask,
    undoToastId,
    eventUndoToastId,
  } = config;

  // Define strongly-typed handler mapping
  const handlers: Record<DayViewShortcutKey, (e: KeyboardEvent) => void> =
    useMemo(
      () => ({
        // Global shortcuts
        "1": (e) => {
          e.preventDefault();
          onNavigateNow?.();
        },
        "2": () => {
          return;
        },
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

        // Calendar shortcuts
        i: (e) => {
          e.preventDefault();
          onFocusAgenda?.();
        },
      }),
      [
        hasFocusedTask,
        isEditingTask,
        onAddTask,
        onCompleteTask,
        onDeleteTask,
        onEditTask,
        onEscape,
        onFocusAgenda,
        onFocusTasks,
        onNavigateNow,
        onNavigateWeek,
        onPrevDay,
        onNextDay,
        onGoToToday,
      ],
    );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!e.key) return;

      const key = e.key.toLowerCase();
      const target = e.target as EventTarget | null;

      // Handle migration shortcuts (Ctrl+Meta+Arrow) - these work even in input fields
      if (e.ctrlKey && e.metaKey) {
        if (key === "arrowright") {
          e.preventDefault();
          // Check if focused within a task and migrate that specific task
          if (isFocusedWithinTask()) {
            const taskId = getFocusedTaskId();
            if (taskId && onMigrateTask) {
              onMigrateTask(taskId, "forward");
              return;
            }
          }
        }
        if (key === "arrowleft") {
          e.preventDefault();
          // Check if focused within a task and migrate that specific task
          if (isFocusedWithinTask()) {
            const taskId = getFocusedTaskId();
            if (taskId && onMigrateTask) {
              onMigrateTask(taskId, "backward");
              return;
            }
          }
        }
      }

      // Handle Cmd+Z / Ctrl+Z undo shortcut separately
      // Prioritize event undo over task undo
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (eventUndoToastId && onRestoreEvent) {
          onRestoreEvent();
          toast.dismiss(eventUndoToastId);
        } else if (undoToastId && onRestoreTask) {
          onRestoreTask();
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
      const handler = handlers[normalizedKey as DayViewShortcutKey];
      if (handler) {
        handler(e);
      }
    },
    [
      handlers,
      onRestoreTask,
      onRestoreEvent,
      onMigrateTask,
      undoToastId,
      eventUndoToastId,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

import { useCallback } from "react";
import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";
import {
  getFocusedTaskId,
  isFocusedOnTaskCheckbox,
  isFocusedWithinTask,
} from "@web/views/Day/util/day.shortcut.util";

interface KeyboardShortcutsConfig {
  // Event management
  onCreateAllDayEvent?: () => void;

  // Task management
  onAddTask?: () => void;
  onEditTask?: () => void;
  onCompleteTask?: () => void;
  onDeleteTask?: () => void;
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

  // Calendar navigation
  onFocusCalendar?: () => void;

  // Event management
  onEditEvent?: () => void;

  // Conditions
  hasFocusedTask?: boolean;
}

/**
 * Hook to handle keyboard shortcuts for the Today view
 */
export function useDayViewShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onCreateAllDayEvent,
    onAddTask,
    onEditTask,
    onCompleteTask,
    onDeleteTask,
    onMigrateTask,
    onEscape,
    onFocusTasks,
    onNextDay,
    onPrevDay,
    onGoToToday,
    onFocusCalendar,
    onEditEvent,
    hasFocusedTask,
  } = config;

  const handleDeleteTask = useCallback(() => {
    if (isFocusedOnTaskCheckbox()) {
      onDeleteTask?.();
    }
  }, [onDeleteTask]);

  const handleEnterKey = useCallback(() => {
    if (hasFocusedTask) {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTaskButton =
        activeElement?.getAttribute("role") === "checkbox" &&
        activeElement?.dataset?.taskId;

      // Let the task button handle Enter if it's focused
      if (!isTaskButton) onCompleteTask?.();
    }
  }, [hasFocusedTask, onCompleteTask]);

  const handleMigrationNavigation = useCallback(
    (direction: "forward" | "backward") => (keyboardEvent: KeyboardEvent) => {
      if (isFocusedWithinTask()) {
        const taskId = getFocusedTaskId();
        if (taskId && onMigrateTask) {
          keyboardEvent.preventDefault();
          onMigrateTask(taskId, direction);
        }
      }
    },
    [onMigrateTask],
  );

  useAppShortcutUp("J", () => {
    onPrevDay?.();
  });

  useAppShortcutUp("K", () => {
    onNextDay?.();
  });

  useAppShortcutUp("T", () => {
    onGoToToday?.();
  });

  // Tasks shortcuts
  useAppShortcutUp("U", () => {
    onFocusTasks?.();
  });

  useAppShortcutUp("C", () => {
    onAddTask?.();
  });

  useAppShortcutUp("A", () => {
    onCreateAllDayEvent?.();
  });

  useAppShortcutUp("E", () => {
    onEditTask?.();
  });

  useAppShortcutUp("Delete", handleDeleteTask);

  useAppShortcutUp("Backspace", handleDeleteTask);

  useAppShortcutUp("Enter", handleEnterKey);

  useAppShortcut(
    "Escape",
    () => {
      onEscape?.();
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  // No `blurOnTrigger` here: it blurs before the handler runs, which would
  // clear the focused task and stop the migration from ever firing.
  useAppShortcut("Shift+ArrowRight", handleMigrationNavigation("forward"));

  useAppShortcut("Shift+ArrowLeft", handleMigrationNavigation("backward"));

  // Calendar shortcuts
  useAppShortcutUp("I", () => {
    onFocusCalendar?.();
  });

  useAppShortcutUp("M", () => {
    onEditEvent?.();
  });
}

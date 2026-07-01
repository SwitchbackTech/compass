import { useCallback } from "react";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hotkeys/useAppHotkey";
import {
  getFocusedTaskId,
  isFocusedOnTaskCheckbox,
  isFocusedWithinTask,
} from "@web/views/Day/util/day.shortcut.util";

interface KeyboardShortcutsConfig {
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

  // Sidebar
  onToggleSidebar?: () => void;

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
    onToggleSidebar,
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
    (direction: "forward" | "backward") => () => {
      if (isFocusedWithinTask()) {
        const taskId = getFocusedTaskId();
        if (taskId && onMigrateTask) {
          onMigrateTask(taskId, direction);
        }
      }
    },
    [onMigrateTask],
  );

  useAppHotkeyUp("J", () => {
    onPrevDay?.();
  });

  useAppHotkeyUp("K", () => {
    onNextDay?.();
  });

  useAppHotkeyUp("T", () => {
    onGoToToday?.();
  });

  // Sidebar shortcut
  useAppHotkeyUp("[", () => {
    onToggleSidebar?.();
  });

  // Tasks shortcuts
  useAppHotkeyUp("U", () => {
    onFocusTasks?.();
  });

  useAppHotkeyUp("C", () => {
    onAddTask?.();
  });

  useAppHotkeyUp("E", () => {
    onEditTask?.();
  });

  useAppHotkeyUp("Delete", handleDeleteTask);

  useAppHotkeyUp("Backspace", handleDeleteTask);

  useAppHotkeyUp("Enter", handleEnterKey);

  useAppHotkey(
    "Escape",
    () => {
      onEscape?.();
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkey(
    "Control+Meta+ArrowRight",
    handleMigrationNavigation("forward"),
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkey(
    "Control+Meta+ArrowLeft",
    handleMigrationNavigation("backward"),
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  // Calendar shortcuts
  useAppHotkeyUp("I", () => {
    onFocusCalendar?.();
  });

  useAppHotkeyUp("M", () => {
    onEditEvent?.();
  });
}

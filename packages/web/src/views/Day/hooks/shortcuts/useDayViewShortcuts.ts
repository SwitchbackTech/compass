import { useCallback } from "react";
import { toast } from "react-toastify";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
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

  // Sidebar
  onToggleSidebar?: () => void;

  // Agenda navigation
  onFocusAgenda?: () => void;

  // Event management
  onEditEvent?: () => void;

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
    onNextDay,
    onPrevDay,
    onGoToToday,
    onFocusAgenda,
    onEditEvent,
    onToggleSidebar,
    isEditingTask,
    hasFocusedTask,
    undoToastId,
    eventUndoToastId,
  } = config;

  const handleDeleteTask = useCallback(() => {
    if (isFocusedOnTaskCheckbox()) {
      onDeleteTask?.();
    }
  }, [onDeleteTask]);

  const handleEnterKey = useCallback(() => {
    if (hasFocusedTask && !isEditingTask) {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTaskButton =
        activeElement?.getAttribute("role") === "checkbox" &&
        activeElement?.dataset?.taskId;

      // Let the task button handle Enter if it's focused
      if (!isTaskButton) onCompleteTask?.();
    }
  }, [hasFocusedTask, isEditingTask, onCompleteTask]);

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

  const handleRestore = useCallback(() => {
    if (eventUndoToastId && onRestoreEvent) {
      onRestoreEvent();
      toast.dismiss(eventUndoToastId);
    } else if (undoToastId && onRestoreTask) {
      onRestoreTask();
      toast.dismiss(undoToastId);
    }
  }, [onRestoreTask, onRestoreEvent, undoToastId, eventUndoToastId]);

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

  useAppHotkeyUp("Mod+Z", handleRestore);
  useAppHotkeyUp("Mod+Shift+Z", handleRestore);

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

  useAppHotkey("Mod+ArrowRight", handleMigrationNavigation("forward"), {
    ignoreInputs: false,
    blurOnTrigger: true,
  });

  useAppHotkey("Mod+ArrowLeft", handleMigrationNavigation("backward"), {
    ignoreInputs: false,
    blurOnTrigger: true,
  });

  // Agenda shortcuts
  useAppHotkeyUp("I", () => {
    onFocusAgenda?.();
  });

  useAppHotkeyUp("M", () => {
    onEditEvent?.();
  });
}

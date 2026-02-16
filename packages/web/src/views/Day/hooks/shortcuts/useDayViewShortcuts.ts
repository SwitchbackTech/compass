import { useCallback } from "react";
import { toast } from "react-toastify";
import {
  useKeyDownEvent,
  useKeyUpEvent,
} from "@web/common/hooks/useKeyboardEvent";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
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

  useKeyUpEvent({ combination: ["j"], handler: onPrevDay });

  useKeyUpEvent({ combination: ["k"], handler: onNextDay });

  useKeyUpEvent({ combination: ["t"], handler: onGoToToday });

  // Tasks shortcuts
  useKeyUpEvent({ combination: ["u"], handler: onFocusTasks });

  useKeyUpEvent({ combination: ["c"], handler: onAddTask });

  useKeyUpEvent({ combination: ["e"], handler: onEditTask });

  useKeyUpEvent({ combination: ["Delete"], handler: handleDeleteTask });

  useKeyUpEvent({ combination: ["Backspace"], handler: handleDeleteTask });

  useKeyUpEvent({ combination: ["Enter"], handler: handleEnterKey });

  useKeyUpEvent({
    combination: [getModifierKey(), "z"],
    handler: handleRestore,
  });

  useKeyDownEvent({
    combination: ["Escape"],
    listenWhileEditing: true,
    handler: onEscape,
  });

  useKeyDownEvent({
    combination: ["Control", "Meta", "ArrowRight"],
    exactMatch: false,
    listenWhileEditing: true,
    handler: handleMigrationNavigation("forward"),
  });

  useKeyDownEvent({
    combination: ["Control", "Meta", "ArrowLeft"],
    exactMatch: false,
    listenWhileEditing: true,
    handler: handleMigrationNavigation("backward"),
  });

  // Agenda shortcuts
  useKeyUpEvent({ combination: ["i"], handler: onFocusAgenda });

  useKeyUpEvent({ combination: ["m"], handler: onEditEvent });
}

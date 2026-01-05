import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ID_REMINDER_INPUT } from "@web/common/constants/web.constants";
import {
  useKeyDownEvent,
  useKeyUpEvent,
} from "@web/common/hooks/useKeyboardEvent";
import { Task } from "@web/common/types/task.types";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";

interface Props {
  focusedTask?: Task | null;
  availableTasks?: Task[];
  onPreviousTask?: () => void;
  onNextTask?: () => void;
  onCompleteTask?: () => void;
}

/**
 * Hook to handle keyboard shortcuts for the Now view
 * Handles both global navigation shortcuts (1, 2, 3) and task-specific shortcuts (j, k)
 */
export function useNowShortcuts(props?: Props) {
  const {
    focusedTask = null,
    availableTasks = [],
    onPreviousTask,
    onNextTask,
    onCompleteTask,
  } = props || {};

  const navigate = useNavigate();

  const handleTaskNavigation = useCallback(
    (handler?: () => void) => {
      if (!focusedTask || availableTasks.length === 0) return;

      return handler;
    },
    [focusedTask, availableTasks.length],
  );

  useKeyUpEvent({
    combination: ["d"],
    handler: () =>
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_DESCRIPTION),
  });

  useKeyDownEvent({
    combination: [getModifierKey(), "Enter"],
    listenWhileEditing: true,
    handler: () =>
      compassEventEmitter.emit(CompassDOMEvents.SAVE_TASK_DESCRIPTION),
  });

  useKeyUpEvent({
    combination: ["j"],
    handler: handleTaskNavigation(onPreviousTask),
    deps: [handleTaskNavigation, onPreviousTask],
  });

  useKeyUpEvent({
    combination: ["k"],
    handler: handleTaskNavigation(onNextTask),
    deps: [handleTaskNavigation, onNextTask],
  });

  const handleEnterKey = useCallback(() => {
    // Don't trigger if the reminder input is focused
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement?.id === ID_REMINDER_INPUT) {
      return;
    }
    handleTaskNavigation(onCompleteTask)?.();
  }, [handleTaskNavigation, onCompleteTask]);

  useKeyUpEvent({
    combination: ["Enter"],
    handler: handleEnterKey,
    deps: [handleEnterKey],
  });

  useKeyDownEvent({
    combination: ["Escape"],
    deps: [navigate],
    handler: () => navigate(ROOT_ROUTES.DAY),
  });

  useKeyUpEvent({
    combination: ["Esc"],
    deps: [navigate],
    handler: () => navigate(ROOT_ROUTES.DAY),
  });
}

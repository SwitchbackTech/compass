import { useCallback } from "react";
import { ID_REMINDER_INPUT } from "@web/common/constants/web.constants";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import { type Task } from "@web/common/types/task.types";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";

interface Props {
  focusedTask?: Task | null;
  availableTasks?: Task[];
  onPreviousTask?: () => void;
  onNextTask?: () => void;
  onCompleteTask?: () => void;
  onToggleSidebar?: () => void;
}

export function useNowShortcuts(props?: Props) {
  const {
    focusedTask = null,
    availableTasks = [],
    onPreviousTask,
    onNextTask,
    onCompleteTask,
    onToggleSidebar,
  } = props || {};

  const handleTaskNavigation = useCallback(
    (handler?: () => void) => {
      if (!focusedTask || availableTasks.length === 0) return;

      return handler;
    },
    [focusedTask, availableTasks.length],
  );

  useAppHotkeyUp("E", () => {
    compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_DESCRIPTION);
  });

  useAppHotkey(
    "Mod+Enter",
    () => {
      compassEventEmitter.emit(CompassDOMEvents.SAVE_TASK_DESCRIPTION);
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkeyUp("J", () => {
    handleTaskNavigation(onPreviousTask)?.();
  });

  useAppHotkeyUp("K", () => {
    handleTaskNavigation(onNextTask)?.();
  });

  const handleEnterKey = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement?.id === ID_REMINDER_INPUT) {
      return;
    }
    handleTaskNavigation(onCompleteTask)?.();
  }, [handleTaskNavigation, onCompleteTask]);

  useAppHotkeyUp("Enter", handleEnterKey);

  useAppHotkeyUp("[", () => {
    onToggleSidebar?.();
  });
}

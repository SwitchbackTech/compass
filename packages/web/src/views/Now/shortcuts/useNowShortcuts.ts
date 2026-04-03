import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ID_REMINDER_INPUT } from "@web/common/constants/web.constants";
import { useShortcutEditMode } from "@web/common/context/shortcut-edit-mode";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import { SHORTCUTS } from "@web/common/shortcuts/shortcut.registry";
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

/**
 * Hook to handle keyboard shortcuts for the Now view
 * Handles both global navigation shortcuts (n, d, w) and task-specific shortcuts (j, k)
 */
export function useNowShortcuts(props?: Props) {
  const {
    focusedTask = null,
    availableTasks = [],
    onPreviousTask,
    onNextTask,
    onCompleteTask,
    onToggleSidebar,
  } = props || {};

  const navigate = useNavigate();
  const { armEditMode, clearEditMode, isEditMode } = useShortcutEditMode();

  const handleTaskNavigation = useCallback(
    (handler?: () => void) => {
      if (!focusedTask || availableTasks.length === 0) return;

      return handler;
    },
    [focusedTask, availableTasks.length],
  );

  const editModeHotkey = SHORTCUTS.NOW_FOCUS_DESC.sequence.at(0);

  if (!editModeHotkey) {
    throw new Error("NOW_FOCUS_DESC.sequence must define an edit mode prefix");
  }

  useAppHotkeyUp(editModeHotkey, armEditMode);

  useAppHotkeyUp(
    SHORTCUTS.NOW_FOCUS_DESC.hotkey,
    () => {
      compassEventEmitter.emit(CompassDOMEvents.FOCUS_TASK_DESCRIPTION);
      clearEditMode();
    },
    {
      enabled: isEditMode,
    },
  );

  useAppHotkey(
    SHORTCUTS.NOW_SAVE_DESC.hotkey,
    () => {
      compassEventEmitter.emit(CompassDOMEvents.SAVE_TASK_DESCRIPTION);
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkeyUp(SHORTCUTS.NAV_PREV.hotkey, () => {
    handleTaskNavigation(onPreviousTask)?.();
  });

  useAppHotkeyUp(SHORTCUTS.NAV_NEXT.hotkey, () => {
    handleTaskNavigation(onNextTask)?.();
  });

  const handleEnterKey = useCallback(() => {
    // Don't trigger if the reminder input is focused
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement?.id === ID_REMINDER_INPUT) {
      return;
    }
    handleTaskNavigation(onCompleteTask)?.();
  }, [handleTaskNavigation, onCompleteTask]);

  useAppHotkeyUp(SHORTCUTS.NOW_COMPLETE_TASK.hotkey, handleEnterKey);

  useAppHotkey(
    SHORTCUTS.NOW_ESCAPE.hotkey,
    () => {
      clearEditMode();
      navigate(ROOT_ROUTES.DAY);
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkeyUp(SHORTCUTS.TOGGLE_SIDEBAR.hotkey, () => {
    onToggleSidebar?.();
  });
}

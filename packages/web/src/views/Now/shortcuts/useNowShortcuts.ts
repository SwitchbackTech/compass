import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useHotkeySequence } from "@tanstack/react-hotkeys";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ID_REMINDER_INPUT } from "@web/common/constants/web.constants";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import { type Task } from "@web/common/types/task.types";

interface Props {
  focusedTask?: Task | null;
  availableTasks?: Task[];
  onPreviousTask?: () => void;
  onNextTask?: () => void;
  onCompleteTask?: () => void;
  onEditDescription?: () => void;
  onEditTitle?: () => void;
  onSaveDescription?: () => void;
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
    onEditDescription,
    onEditTitle,
    onSaveDescription,
    onToggleSidebar,
  } = props || {};

  const navigate = useNavigate();
  const isTaskEditingEnabled = Boolean(focusedTask);

  const handleTaskNavigation = useCallback(
    (handler?: () => void) => {
      if (!focusedTask || availableTasks.length === 0) return;

      return handler;
    },
    [focusedTask, availableTasks.length],
  );

  useHotkeySequence(
    ["E", "D"],
    () => {
      onEditDescription?.();
    },
    {
      enabled: isTaskEditingEnabled,
      eventType: "keyup",
      ignoreInputs: true,
      conflictBehavior: "allow",
    },
  );

  useHotkeySequence(
    ["E", "T"],
    () => {
      onEditTitle?.();
    },
    {
      enabled: isTaskEditingEnabled,
      eventType: "keyup",
      ignoreInputs: true,
      conflictBehavior: "allow",
    },
  );

  useAppHotkey("Mod+Enter", () => onSaveDescription?.(), {
    ignoreInputs: false,
    blurOnTrigger: true,
  });

  useAppHotkeyUp("J", () => {
    handleTaskNavigation(onPreviousTask)?.();
  });

  useAppHotkeyUp("K", () => {
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

  useAppHotkeyUp("Enter", handleEnterKey);

  useAppHotkey(
    "Escape",
    () => {
      navigate(ROOT_ROUTES.DAY);
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  // Sidebar shortcut
  useAppHotkeyUp("[", () => {
    onToggleSidebar?.();
  });
}

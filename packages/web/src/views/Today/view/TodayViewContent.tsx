import React from "react";
import { CalendarAgenda } from "../components/CalendarAgenda/CalendarAgenda";
import { ShortcutsOverlay } from "../components/Shortcuts/ShortcutsOverlay";
import { TaskList } from "../components/Tasks/TaskList";
import { useTodayViewShortcuts } from "../hooks/useTodayViewShortcuts";
import { focusOnAddTaskInput } from "../util/shortcut.util";

export const TodayViewContent = () => {
  const activeElement =
    typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)
      : null;
  const isEditableElement =
    (typeof HTMLInputElement !== "undefined" &&
      activeElement instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== "undefined" &&
      activeElement instanceof HTMLTextAreaElement) ||
    activeElement?.getAttribute("contenteditable") === "true";

  useTodayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    isInInput: isEditableElement,
  });

  return (
    <div className="flex h-screen w-full items-center justify-center gap-8 overflow-hidden px-6 py-8">
      <ShortcutsOverlay />
      <TaskList />

      <CalendarAgenda />
    </div>
  );
};

import React from "react";
import { CalendarAgenda } from "../components/CalendarAgenda/CalendarAgenda";
import { ShortcutsOverlay } from "../components/Shortcuts/ShortcutsOverlay";
import { TaskList } from "../components/Tasks/TaskList";
import { useTasks } from "../context/TaskProvider";
import { useTodayViewShortcuts } from "../hooks/useTodayViewShortcuts";
import { focusOnAddTaskInput, focusOnFirstTask } from "../util/shortcut.util";

export const TodayViewContent = () => {
  const { tasks, setEditingTaskId, setEditingTitle, selectedTaskIndex } =
    useTasks();

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

  const handleEditTask = () => {
    const selectedTask = tasks[selectedTaskIndex];
    if (selectedTask) {
      setEditingTaskId(selectedTask.id);
      setEditingTitle(selectedTask.title);
    }
  };

  const hasFocusedTask =
    selectedTaskIndex >= 0 && selectedTaskIndex < tasks.length;

  useTodayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onFocusTasks: focusOnFirstTask,
    isInInput: isEditableElement,
    hasFocusedTask,
  });

  return (
    <div className="flex h-screen w-full items-center justify-center gap-8 overflow-hidden px-6 py-8">
      <ShortcutsOverlay />
      <TaskList />

      <CalendarAgenda />
    </div>
  );
};

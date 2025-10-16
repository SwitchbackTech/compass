import React from "react";
import { CalendarAgenda } from "../components/CalendarAgenda/CalendarAgenda";
import { ShortcutsOverlay } from "../components/Shortcuts/ShortcutsOverlay";
import { TaskList } from "../components/TaskList/TaskList";
import { useTasks } from "../context/TaskProvider";
import { useTodayViewShortcuts } from "../hooks/useTodayViewShortcuts";
import { focusOnAddTaskInput, focusOnFirstTask } from "../util/shortcut.util";

export const TodayViewContent = () => {
  const { tasks, setEditingTaskId, setEditingTitle, selectedTaskIndex } =
    useTasks();

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

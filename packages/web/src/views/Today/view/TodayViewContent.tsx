import React from "react";
import { CalendarAgenda } from "../components/CalendarAgenda/CalendarAgenda";
import { ShortcutsOverlay } from "../components/Shortcuts/ShortcutsOverlay";
import { TaskList } from "../components/TaskList/TaskList";
import { useTasks } from "../context/TaskProvider";
import { useTodayViewShortcuts } from "../hooks/shortcuts/useTodayViewShortcuts";
import { focusOnAddTaskInput, focusOnFirstTask } from "../util/shortcut.util";

export const TodayViewContent = () => {
  const {
    tasks,
    selectedTaskIndex,
    focusOnInputByIndex,
    setSelectedTaskIndex,
    setEditingTaskId,
    setEditingTitle,
  } = useTasks();

  const hasFocusedTask =
    selectedTaskIndex >= 0 && selectedTaskIndex < tasks.length;

  const getTaskIndexToEdit = () => {
    if (hasFocusedTask) {
      return selectedTaskIndex;
    } else if (tasks.length > 0) {
      return 0;
    }
    return -1;
  };

  const handleEditTask = () => {
    const taskIndexToEdit = getTaskIndexToEdit();
    if (taskIndexToEdit >= 0) {
      setEditingTaskId(tasks[taskIndexToEdit].id);
      setEditingTitle(tasks[taskIndexToEdit].title);
      setSelectedTaskIndex(taskIndexToEdit);
      focusOnInputByIndex(taskIndexToEdit);
    }
  };

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

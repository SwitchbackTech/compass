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
    deleteTask,
    restoreTask,
    navigateToNextDay,
    navigateToPreviousDay,
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

  const handleDeleteTask = () => {
    // Get the task ID directly from the active element
    const activeElement = document.activeElement as HTMLElement | null;
    const taskId = activeElement?.dataset?.taskId;

    if (taskId) {
      deleteTask(taskId);
    }
  };

  useTodayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onRestoreTask: restoreTask,
    onFocusTasks: focusOnFirstTask,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
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

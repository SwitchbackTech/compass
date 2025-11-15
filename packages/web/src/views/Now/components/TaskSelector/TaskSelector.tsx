import { useEffect } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/views/Day/util/storage.util";
import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { AvailableTasks } from "../AvailableTasks/AvailableTasks";
import { FocusedTask } from "../FocusedTask/FocusedTask";

export const TaskSelector = () => {
  const { focusedTask, setFocusedTask } = useFocusedTask();
  const { availableTasks } = useAvailableTasks();

  // Auto-focus on the first incomplete task when no task is focused
  useEffect(() => {
    if (!focusedTask && availableTasks.length > 0) {
      setFocusedTask(availableTasks[0].id);
    }
  }, [focusedTask, availableTasks, setFocusedTask]);

  const handleSelectTask = (taskId: string) => {
    setFocusedTask(taskId);
  };

  const handleCompleteTask = () => {
    if (!focusedTask) return;

    // Find the current task's index in availableTasks before completing it
    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );

    // Mark the current task as completed
    const today = dayjs().utc();
    const dateKey = getDateKey(today.toDate());
    const tasks = loadTasksFromStorage(dateKey);
    const updatedTasks = tasks.map((task) =>
      task.id === focusedTask.id
        ? { ...task, status: "completed" as const }
        : task,
    );
    saveTasksToStorage(dateKey, updatedTasks);

    // Find the next incomplete task
    // If there's a next task in the availableTasks list, focus on it
    if (currentTaskIndex >= 0 && currentTaskIndex < availableTasks.length - 1) {
      // Next task exists
      setFocusedTask(availableTasks[currentTaskIndex + 1].id);
    } else if (currentTaskIndex > 0) {
      // Previous task exists (we're at the end, go to previous)
      setFocusedTask(availableTasks[currentTaskIndex - 1].id);
    } else {
      // No more incomplete tasks
      setFocusedTask(null);
    }
  };

  if (focusedTask) {
    return (
      <FocusedTask task={focusedTask} onCompleteTask={handleCompleteTask} />
    );
  }

  return (
    <AvailableTasks tasks={availableTasks} onSelectTask={handleSelectTask} />
  );
};

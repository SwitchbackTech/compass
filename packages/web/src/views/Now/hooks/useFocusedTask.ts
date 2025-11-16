import { useState } from "react";
import { Task } from "@web/views/Day/task.types";
import {
  getTodayDateKey,
  loadTasksFromStorage,
} from "@web/views/Day/util/storage.util";

export function useFocusedTask() {
  const [focusedTask, setFocusedTaskState] = useState<Task | null>(null);

  const setFocusedTask = (taskId: string | null) => {
    if (taskId === null) {
      setFocusedTaskState(null);
      return;
    }

    // Find the task to ensure it exists (today only)
    const dateKey = getTodayDateKey();
    const tasks = loadTasksFromStorage(dateKey);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      // Don't allow focusing on completed tasks
      if (task.status === "completed") {
        setFocusedTaskState(null);
        return;
      }
      setFocusedTaskState(task);
      return;
    }

    // Task not found
    setFocusedTaskState(null);
  };

  return {
    focusedTask,
    setFocusedTask,
  };
}

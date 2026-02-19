import { useCallback, useEffect, useState } from "react";
import { Task } from "@web/common/types/task.types";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";

interface UseFocusedTaskOptions {
  availableTasks?: Task[];
}

export function useFocusedTask({
  availableTasks = [],
}: UseFocusedTaskOptions = {}) {
  const [focusedTask, setFocusedTaskState] = useState<Task | null>(null);

  const setFocusedTask = useCallback((taskId: string | null) => {
    if (taskId === null) {
      setFocusedTaskState(null);
      return;
    }

    // Find the task to ensure it exists (today only)
    const dateKey = getDateKey();
    const tasks = loadTasksFromStorage(dateKey);
    const task = tasks.find((t) => t._id === taskId);
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
  }, []);

  useEffect(() => {
    if (!focusedTask && availableTasks.length > 0) {
      setFocusedTask(availableTasks[0]._id);
    }
  }, [focusedTask, availableTasks, setFocusedTask]);

  return {
    focusedTask,
    setFocusedTask,
  };
}

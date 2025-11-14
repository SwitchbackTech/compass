import { useEffect, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { Task } from "@web/views/Day/task.types";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/views/Day/util/storage.util";
import {
  clearFocusedTask as clearStorage,
  getFocusedTaskId,
  setFocusedTaskId,
} from "../utils/focused-task-storage.util";

export function useFocusedTask() {
  const [focusedTask, setFocusedTaskState] = useState<Task | null>(null);

  // Load focused task on mount and when storage changes
  useEffect(() => {
    const loadFocusedTask = () => {
      const focusedTaskId = getFocusedTaskId();
      if (!focusedTaskId) {
        setFocusedTaskState(null);
        return;
      }

      // Search for the task in today only
      const today = dayjs().utc();
      const dateKey = getDateKey(today.toDate());
      const tasks = loadTasksFromStorage(dateKey);
      const task = tasks.find((t) => t.id === focusedTaskId);
      if (task) {
        setFocusedTaskState(task);
        return;
      }

      // Task not found, clear it from storage
      clearStorage();
      setFocusedTaskState(null);
    };

    loadFocusedTask();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.FOCUSED_TASK_ID ||
        e.key === null ||
        e.key?.startsWith("compass.today.tasks")
      ) {
        loadFocusedTask();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setFocusedTask = (taskId: string | null) => {
    if (taskId === null) {
      clearStorage();
      setFocusedTaskState(null);
      return;
    }

    // Find the task to ensure it exists (today only)
    const today = dayjs().utc();
    const dateKey = getDateKey(today.toDate());
    const tasks = loadTasksFromStorage(dateKey);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setFocusedTaskId(taskId);
      setFocusedTaskState(task);
      return;
    }

    // Task not found
    clearStorage();
    setFocusedTaskState(null);
  };

  return {
    focusedTask,
    setFocusedTask,
  };
}

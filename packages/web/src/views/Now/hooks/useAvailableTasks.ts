import { useEffect, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/views/Day/task.types";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/views/Day/util/storage.util";

export function useAvailableTasks() {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadAvailableTasks = () => {
      const today = dayjs().utc();
      const dateKey = getDateKey(today.toDate());
      const tasks = loadTasksFromStorage(dateKey);

      // Store all tasks
      setAllTasks(tasks);

      // Filter out completed tasks and sort by creation date (newest first)
      const incompleteTasks = tasks
        .filter((task) => task.status === "todo")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      setAvailableTasks(incompleteTasks);
    };

    loadAvailableTasks();

    // Listen for storage changes to reload tasks
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === null || e.key?.startsWith("compass.today.tasks")) {
        loadAvailableTasks();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Determine if all tasks are completed (has tasks but none are incomplete)
  const hasCompletedTasks = allTasks.length > 0 && availableTasks.length === 0;

  return {
    availableTasks,
    allTasks,
    hasCompletedTasks,
  };
}

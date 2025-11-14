import { useEffect, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/views/Day/task.types";
import {
  getDateKey,
  loadTasksFromStorage,
} from "@web/views/Day/util/storage.util";

export function useAvailableTasks() {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadAvailableTasks = () => {
      const today = dayjs().utc();
      const dateKey = getDateKey(today.toDate());
      const tasks = loadTasksFromStorage(dateKey);

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

  return {
    availableTasks,
  };
}

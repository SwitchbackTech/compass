import { useEffect, useState } from "react";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  loadTodayTasks,
} from "@web/common/utils/storage/storage.util";

export function getStoredTasksInitialValue() {
  if (typeof window === "undefined") {
    return [];
  }
  return loadTodayTasks();
}

export function useStoredTasks() {
  const [tasks, setTasks] = useState(() => getStoredTasksInitialValue());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleTasksSaved = () => {
      setTasks(loadTodayTasks());
    };

    window.addEventListener(
      COMPASS_TASKS_SAVED_EVENT_NAME,
      handleTasksSaved as EventListener,
    );

    return () => {
      window.removeEventListener(
        COMPASS_TASKS_SAVED_EVENT_NAME,
        handleTasksSaved as EventListener,
      );
    };
  }, []);

  return tasks;
}

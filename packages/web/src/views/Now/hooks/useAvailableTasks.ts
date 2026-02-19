import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";
import { CompassTasksSavedEvent } from "@web/common/utils/storage/storage.types";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import { getIncompleteTasksSorted } from "@web/common/utils/task/sort.task";
import { TaskContext } from "@web/views/Day/context/TaskContext";

export function useAvailableTasks() {
  const [storedTasks, setStoredTasks] = useState<Task[]>([]);
  const taskContext = useContext(TaskContext);
  const hasTaskContext = taskContext !== undefined;

  const loadStoredTasks = useCallback(async () => {
    const dateKey = getDateKey();
    return await loadTasksFromStorage(dateKey);
  }, []);

  useEffect(() => {
    if (hasTaskContext) {
      return;
    }

    let isCancelled = false;
    const reloadTasks = () => {
      void loadStoredTasks()
        .then((tasks) => {
          if (isCancelled) return;
          setStoredTasks(tasks);
        })
        .catch((error) => {
          if (isCancelled) return;
          console.error("Failed to load tasks from storage:", error);
          setStoredTasks([]);
        });
    };

    reloadTasks();

    // Listen for custom event (same-tab synchronization)
    const handleTasksSaved = (event: CompassTasksSavedEvent) => {
      if (event.detail.dateKey === getDateKey()) {
        reloadTasks();
      }
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
      isCancelled = true;
    };
  }, [hasTaskContext, loadStoredTasks]);

  const contextTasksForToday = useMemo(() => {
    if (!hasTaskContext || !taskContext) {
      return null;
    }

    const todayKey = getDateKey();
    return taskContext.tasks.filter((task) => {
      const taskDate = dayjs(task.createdAt).utc();
      const taskDateKey = getDateKey(taskDate.toDate());
      return taskDateKey === todayKey;
    });
  }, [hasTaskContext, taskContext]);

  const allTasks = contextTasksForToday ?? storedTasks;
  const availableTasks = useMemo(
    () => getIncompleteTasksSorted(allTasks),
    [allTasks],
  );
  const hasCompletedTasks = allTasks.length > 0 && availableTasks.length === 0;

  return {
    availableTasks,
    allTasks,
    hasCompletedTasks,
  };
}

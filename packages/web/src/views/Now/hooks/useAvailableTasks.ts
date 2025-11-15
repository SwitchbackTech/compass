import { useContext, useEffect, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { TaskContext } from "@web/views/Day/context/TaskProvider";
import { Task } from "@web/views/Day/task.types";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  CompassTasksSavedEvent,
  getDateKey,
  loadTasksFromStorage,
} from "@web/views/Day/util/storage.util";

export function useAvailableTasks() {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // Try to use TaskContext if available (for tests and when used within TaskProvider)
  const taskContext = useContext(TaskContext);
  const useContextTasks = taskContext !== undefined;

  const processTasks = (tasks: Task[]) => {
    // Store all tasks
    setAllTasks(tasks);

    // Filter out completed tasks and sort by creation date (newest first)
    // Use array index as tie-breaker for tasks with identical timestamps
    const incompleteTasks = tasks
      .filter((task) => task.status === "todo")
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        const timeDiff =
          new Date(b.task.createdAt).getTime() -
          new Date(a.task.createdAt).getTime();
        return timeDiff !== 0 ? timeDiff : b.index - a.index;
      })
      .map(({ task }) => task);

    setAvailableTasks(incompleteTasks);
  };

  useEffect(() => {
    if (useContextTasks && taskContext) {
      // Use tasks from context (for tests and when used within TaskProvider)
      const today = dayjs().utc();
      const dateKey = getDateKey(today.toDate());
      const contextTasks = taskContext.tasks;

      // Filter tasks for today only
      const todayTasks = contextTasks.filter((task) => {
        const taskDate = dayjs(task.createdAt).utc();
        const taskDateKey = getDateKey(taskDate.toDate());
        return taskDateKey === dateKey;
      });

      processTasks(todayTasks);
    } else {
      // Fall back to localStorage (for production use outside TaskProvider)
      const loadAvailableTasks = () => {
        const today = dayjs().utc();
        const dateKey = getDateKey(today.toDate());
        const tasks = loadTasksFromStorage(dateKey);
        processTasks(tasks);
      };

      loadAvailableTasks();

      // Listen for storage changes to reload tasks (cross-tab synchronization)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === null || e.key?.startsWith("compass.today.tasks")) {
          loadAvailableTasks();
        }
      };

      // Listen for custom event (same-tab synchronization)
      const handleTasksSaved = (e: CompassTasksSavedEvent) => {
        const today = dayjs().utc();
        const todayDateKey = getDateKey(today.toDate());
        // Only reload if the saved tasks are for today
        if (e.detail.dateKey === todayDateKey) {
          loadAvailableTasks();
        }
      };

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener(
        COMPASS_TASKS_SAVED_EVENT_NAME,
        handleTasksSaved as EventListener,
      );
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(
          COMPASS_TASKS_SAVED_EVENT_NAME,
          handleTasksSaved as EventListener,
        );
      };
    }
  }, [useContextTasks, taskContext?.tasks, taskContext]);

  // Determine if all tasks are completed (has tasks but none are incomplete)
  const hasCompletedTasks = allTasks.length > 0 && availableTasks.length === 0;

  return {
    availableTasks,
    allTasks,
    hasCompletedTasks,
  };
}

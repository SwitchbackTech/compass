import { useCallback, useEffect, useRef, useState } from "react";
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
  const focusRequestIdRef = useRef(0);

  const setFocusedTask = useCallback((taskId: string | null) => {
    const requestId = focusRequestIdRef.current + 1;
    focusRequestIdRef.current = requestId;

    if (taskId === null) {
      setFocusedTaskState(null);
      return;
    }

    // Find the task to ensure it exists (today only)
    const dateKey = getDateKey();
    void loadTasksFromStorage(dateKey)
      .then((tasks) => {
        if (requestId !== focusRequestIdRef.current) return;

        const task = tasks.find((t) => t._id === taskId);
        if (!task || task.status === "completed") {
          setFocusedTaskState(null);
          return;
        }

        setFocusedTaskState(task);
      })
      .catch((error) => {
        if (requestId !== focusRequestIdRef.current) return;
        console.error("Failed to load tasks for focus state:", error);
        setFocusedTaskState(null);
      });
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

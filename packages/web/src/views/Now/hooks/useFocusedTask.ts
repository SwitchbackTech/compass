import { useCallback, useEffect, useMemo, useState } from "react";
import { Task } from "@web/common/types/task.types";

interface UseFocusedTaskOptions {
  availableTasks?: Task[];
}

export function useFocusedTask({
  availableTasks = [],
}: UseFocusedTaskOptions = {}) {
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const focusedTask = useMemo(() => {
    if (!focusedTaskId) {
      return null;
    }
    return availableTasks.find((task) => task._id === focusedTaskId) ?? null;
  }, [availableTasks, focusedTaskId]);

  const setFocusedTask = useCallback((taskId: string | null) => {
    setFocusedTaskId(taskId);
  }, []);

  useEffect(() => {
    if (availableTasks.length === 0) {
      if (focusedTaskId !== null) {
        setFocusedTaskId(null);
      }
      return;
    }

    if (!focusedTask && availableTasks.length > 0) {
      setFocusedTaskId(availableTasks[0]._id);
    }
  }, [focusedTask, focusedTaskId, availableTasks]);

  return {
    focusedTask,
    setFocusedTask,
  };
}

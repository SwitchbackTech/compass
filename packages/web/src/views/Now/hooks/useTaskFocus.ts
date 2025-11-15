import { useEffect } from "react";
import { Task } from "@web/views/Day/task.types";

interface Props {
  focusedTask: Task | null;
  availableTasks: Task[];
  setFocusedTask: (taskId: string | null) => void;
}

export function useTaskFocus({
  focusedTask,
  availableTasks,
  setFocusedTask,
}: Props) {
  // Auto-focus on the first incomplete task when no task is focused
  useEffect(() => {
    if (!focusedTask && availableTasks.length > 0) {
      setFocusedTask(availableTasks[0].id);
    }
  }, [focusedTask, availableTasks, setFocusedTask]);
}

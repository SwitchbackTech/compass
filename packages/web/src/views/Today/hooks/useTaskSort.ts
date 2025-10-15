import { useEffect, useRef } from "react";
import { Task } from "../task.types";
import { sortTasksByStatus } from "../util/sort.task";

/**
 * Custom hook that sorts tasks by status on initial load.
 * Only sorts once when tasks are first loaded from storage.
 *
 * @param tasks - Array of tasks to potentially sort
 * @param setTasks - State setter function for tasks
 */
export function useTaskSort(tasks: Task[], setTasks: (tasks: Task[]) => void) {
  const hasSortedRef = useRef(false);

  useEffect(() => {
    // Only sort on initial load, not on subsequent updates
    if (!hasSortedRef.current) {
      const sortedTasks = sortTasksByStatus(tasks);
      setTasks(sortedTasks);
      hasSortedRef.current = true;
    }
  }, [tasks, setTasks]);
}

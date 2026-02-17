import { useEffect, useState } from "react";
import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromIndexedDB,
  saveTasksToIndexedDB,
} from "@web/common/utils/storage/task.storage.util";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";

interface UseTaskEffectsProps {
  tasks: Task[];
  dateKey: string;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

interface LoadState {
  dateKey: string | null;
  didFail: boolean;
}

export function useTaskEffects({
  tasks,
  dateKey,
  setTasks,
}: UseTaskEffectsProps): void {
  const [loadState, setLoadState] = useState<LoadState>({
    dateKey: null,
    didFail: false,
  });

  // Load Effect: Runs when dateKey changes (async)
  useEffect(() => {
    let isCancelled = false;

    const loadTasks = async () => {
      try {
        const loadedTasks = await loadTasksFromIndexedDB(dateKey);
        if (isCancelled) return;

        const sortedTasks = sortTasksByStatus(loadedTasks);
        setTasks((prevTasks) =>
          prevTasks.length === 0
            ? sortedTasks
            : sortTasksByStatus([
                ...prevTasks,
                ...sortedTasks.filter(
                  (loadedTask) =>
                    !prevTasks.some(
                      (prevTask) => prevTask.id === loadedTask.id,
                    ),
                ),
              ]),
        );

        setLoadState({ dateKey, didFail: false });
      } catch (error) {
        console.error("Failed to load tasks from IndexedDB:", error);
        if (isCancelled) return;

        // Keep current behavior: reset UI to empty tasks on load failure.
        setTasks([]);
        setLoadState({ dateKey, didFail: true });
      }
    };

    loadTasks();

    return () => {
      isCancelled = true;
    };
  }, [dateKey, setTasks]);

  // Save Effect: Runs when tasks or dateKey changes (async)
  useEffect(() => {
    // Invariant: never persist until the load attempt for this date is complete.
    if (loadState.dateKey !== dateKey) {
      return;
    }

    // Invariant: never overwrite persisted data with empty tasks after load failure.
    if (loadState.didFail && tasks.length === 0) {
      return;
    }

    let isCancelled = false;

    const saveTasks = async () => {
      try {
        if (isCancelled) return;
        await saveTasksToIndexedDB(dateKey, tasks);
      } catch (error) {
        console.error("Failed to save tasks to IndexedDB:", error);
      }
    };

    saveTasks();

    return () => {
      isCancelled = true;
    };
  }, [tasks, dateKey, loadState]);
}

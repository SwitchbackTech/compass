import { useEffect, useRef, useState } from "react";
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

export function useTaskEffects({
  tasks,
  dateKey,
  setTasks,
}: UseTaskEffectsProps): void {
  // Track the dateKey for which we have successfully loaded data.
  // We use this to prevent overwriting IndexedDB with empty state
  // before the initial load for a new date has completed.
  const [syncedDateKey, setSyncedDateKey] = useState<string | null>(null);

  // Track if we're currently loading to prevent race conditions
  const isLoadingRef = useRef(false);

  // Load Effect: Runs when dateKey changes (async)
  useEffect(() => {
    // If we've already synced this date, don't reload.
    if (syncedDateKey === dateKey) return;

    // Prevent concurrent loads
    if (isLoadingRef.current) return;

    const loadTasks = async () => {
      isLoadingRef.current = true;
      try {
        const loadedTasks = await loadTasksFromIndexedDB(dateKey);
        const sortedTasks = sortTasksByStatus(loadedTasks);

        setTasks(sortedTasks);
        // Marking as synced triggers a re-render.
        // The save effect will then see syncedDateKey === dateKey and be enabled.
        setSyncedDateKey(dateKey);
      } catch (error) {
        console.error("Failed to load tasks from IndexedDB:", error);
        // On error, still set empty tasks to prevent UI issues
        setTasks([]);
        setSyncedDateKey(dateKey);
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadTasks();
  }, [dateKey, syncedDateKey, setTasks]);

  // Save Effect: Runs when tasks or dateKey changes (async)
  useEffect(() => {
    // strict guard: never save if we haven't confirmed loading for this specific date
    if (syncedDateKey !== dateKey) {
      return;
    }

    const saveTasks = async () => {
      try {
        await saveTasksToIndexedDB(dateKey, tasks);
      } catch (error) {
        console.error("Failed to save tasks to IndexedDB:", error);
      }
    };

    saveTasks();
  }, [tasks, dateKey, syncedDateKey]);
}

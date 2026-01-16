import { useEffect, useState } from "react";
import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
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
  // We use this to prevent overwriting localStorage with empty state
  // before the initial load for a new date has completed.
  const [syncedDateKey, setSyncedDateKey] = useState<string | null>(null);

  // Load Effect: Runs when dateKey changes
  useEffect(() => {
    // If we've already synced this date, don't reload.
    if (syncedDateKey === dateKey) return;

    const loadedTasks = loadTasksFromStorage(dateKey);
    const sortedTasks = sortTasksByStatus(loadedTasks);

    setTasks(sortedTasks);
    // Marking as synced triggers a re-render.
    // The save effect will then see syncedDateKey === dateKey and be enabled.
    setSyncedDateKey(dateKey);
  }, [dateKey, syncedDateKey, setTasks]);

  // Save Effect: Runs when tasks or dateKey changes
  useEffect(() => {
    // strict guard: never save if we haven't confirmed loading for this specific date
    if (syncedDateKey !== dateKey) {
      return;
    }
    saveTasksToStorage(dateKey, tasks);
  }, [tasks, dateKey, syncedDateKey]);
}

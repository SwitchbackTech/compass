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
  lastLoadedKeyRef: React.MutableRefObject<string | null>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export function useTaskEffects({
  tasks,
  dateKey,
  lastLoadedKeyRef,
  setTasks,
}: UseTaskEffectsProps): void {
  // Track the dateKey for which we've completed loading using state to ensure
  // we only save after a re-render has populated the tasks
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);

  // Load tasks from localStorage when date changes
  // Note: Task seeding happens in loadSpecificDayData loader, so tasks should already exist
  useEffect(() => {
    if (lastLoadedKeyRef.current === dateKey) {
      // If we've already loaded this key (e.g. from parent state persistence),
      // make sure our local loaded state is synced so saving can happen
      if (loadedDateKey !== dateKey) {
        setLoadedDateKey(dateKey);
      }
      return;
    }
    lastLoadedKeyRef.current = dateKey;

    const loadedTasks = loadTasksFromStorage(dateKey);
    const sortedTasks = sortTasksByStatus(loadedTasks);
    setTasks(sortedTasks);
    setLoadedDateKey(dateKey);
  }, [dateKey, lastLoadedKeyRef, setTasks, loadedDateKey]);

  // Save tasks to localStorage whenever they change (but only after initial load completes)
  useEffect(() => {
    // Skip saving if we haven't finished initializing for this dateKey
    if (loadedDateKey !== dateKey) {
      return;
    }
    saveTasksToStorage(dateKey, tasks);
  }, [tasks, dateKey, loadedDateKey]);
}

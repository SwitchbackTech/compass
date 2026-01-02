import { useEffect } from "react";
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
  // Load tasks from localStorage when date changes
  // Note: Task seeding happens in loadSpecificDayData loader, so tasks should already exist
  useEffect(() => {
    if (lastLoadedKeyRef.current === dateKey) return;
    lastLoadedKeyRef.current = dateKey;

    const loadedTasks = loadTasksFromStorage(dateKey);
    const sortedTasks = sortTasksByStatus(loadedTasks);
    setTasks(sortedTasks);
  }, [dateKey, lastLoadedKeyRef, setTasks]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    saveTasksToStorage(dateKey, tasks);
  }, [tasks, dateKey]);
}

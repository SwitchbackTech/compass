import { useEffect } from "react";
import { Task } from "../../task.types";
import { sortTasksByStatus } from "../../util/sort.task";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "../../util/storage.util";

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

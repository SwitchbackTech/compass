import { useMemo } from "react";
import { LocalTaskRepository } from "./local.task.repository";
import { TaskRepository } from "./task.repository";

/**
 * React hook to get the task repository.
 * Always returns LocalTaskRepository since tasks are always stored locally.
 * Memoizes the repository instance to avoid recreating on each render.
 */
export function useTaskRepository(): TaskRepository {
  return useMemo(() => new LocalTaskRepository(), []);
}

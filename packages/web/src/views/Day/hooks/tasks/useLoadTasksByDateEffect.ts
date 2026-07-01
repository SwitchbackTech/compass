import { type MutableRefObject, useEffect } from "react";
import { type TaskRepository } from "@web/common/repositories/task/task.repository";
import { ensureOfflineDataStoreReady } from "@web/common/storage/offline-data/offline-data.store.registry";
import { type Task } from "@web/common/types/task.types";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";

interface UseLoadTasksByDateEffectProps {
  dateKey: string;
  taskRepository: TaskRepository;
  onTaskLoadStart: () => void;
  onTaskLoadSuccess: (tasks: Task[], dateKey: string) => void;
  onTaskLoadFailure: (dateKey: string) => void;
  isDirtyRef: MutableRefObject<boolean>;
  loadRequestIdRef: MutableRefObject<number>;
}

export function useLoadTasksByDateEffect({
  dateKey,
  taskRepository,
  onTaskLoadFailure,
  onTaskLoadStart,
  onTaskLoadSuccess,
  isDirtyRef,
  loadRequestIdRef,
}: UseLoadTasksByDateEffectProps) {
  useEffect(() => {
    let isCancelled = false;
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    isDirtyRef.current = false;
    onTaskLoadStart();

    void (async () => {
      await ensureOfflineDataStoreReady();
      return taskRepository.get(dateKey);
    })()
      .then((loadedTasks) => {
        if (isCancelled || requestId !== loadRequestIdRef.current) return;

        onTaskLoadSuccess(sortTasksByStatus(loadedTasks), dateKey);
      })
      .catch((error) => {
        if (isCancelled || requestId !== loadRequestIdRef.current) return;

        console.error("Failed to load tasks from storage:", error);
        onTaskLoadFailure(dateKey);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    dateKey,
    taskRepository,
    isDirtyRef,
    loadRequestIdRef,
    onTaskLoadFailure,
    onTaskLoadStart,
    onTaskLoadSuccess,
  ]);
}

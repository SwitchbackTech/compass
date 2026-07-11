import { type MutableRefObject, useEffect } from "react";
import { ensureOfflineDataStoreReady } from "@web/common/storage/offline-data/offline-data.store.registry";
import { type Task } from "@web/common/types/task.types";
import { type TaskRepository } from "@web/tasks/repositories/task.repository";

interface UseSaveTasksByDateEffectProps {
  dateKey: string;
  tasks: Task[];
  taskRepository: TaskRepository;
  isLoadingTasks: boolean;
  didLoadFail: boolean;
  loadedDateKey: string | null;
  isDirtyRef: MutableRefObject<boolean>;
  saveRequestIdRef: MutableRefObject<number>;
}

export function useSaveTasksByDateEffect({
  dateKey,
  tasks,
  taskRepository,
  isLoadingTasks,
  didLoadFail,
  loadedDateKey,
  isDirtyRef,
  saveRequestIdRef,
}: UseSaveTasksByDateEffectProps) {
  useEffect(() => {
    if (isLoadingTasks) return;
    if (didLoadFail) return;
    if (loadedDateKey !== dateKey) return;
    if (!isDirtyRef.current) return;

    let isCancelled = false;
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;

    void (async () => {
      await ensureOfflineDataStoreReady();
      await taskRepository.save(dateKey, tasks);
    })()
      .then(() => {
        if (isCancelled || requestId !== saveRequestIdRef.current) return;
        isDirtyRef.current = false;
      })
      .catch((error) => {
        console.error("Failed to save tasks to storage:", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    dateKey,
    didLoadFail,
    isDirtyRef,
    isLoadingTasks,
    loadedDateKey,
    saveRequestIdRef,
    taskRepository,
    tasks,
  ]);
}

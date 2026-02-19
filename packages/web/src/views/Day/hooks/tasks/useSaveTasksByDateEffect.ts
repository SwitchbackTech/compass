import { MutableRefObject, useEffect } from "react";
import { Task } from "@web/common/types/task.types";
import { saveTasksToIndexedDB } from "@web/common/utils/storage/task.storage.util";

interface UseSaveTasksByDateEffectProps {
  dateKey: string;
  tasks: Task[];
  isLoadingTasks: boolean;
  didLoadFail: boolean;
  loadedDateKey: string | null;
  isDirtyRef: MutableRefObject<boolean>;
  saveRequestIdRef: MutableRefObject<number>;
}

export function useSaveTasksByDateEffect({
  dateKey,
  tasks,
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

    void saveTasksToIndexedDB(dateKey, tasks)
      .then(() => {
        if (isCancelled || requestId !== saveRequestIdRef.current) return;
        isDirtyRef.current = false;
      })
      .catch((error) => {
        console.error("Failed to save tasks to IndexedDB:", error);
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
    tasks,
  ]);
}

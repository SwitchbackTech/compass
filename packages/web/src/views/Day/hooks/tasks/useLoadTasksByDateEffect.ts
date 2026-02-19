import { Dispatch, MutableRefObject, SetStateAction, useEffect } from "react";
import { Task } from "@web/common/types/task.types";
import { loadTasksFromIndexedDB } from "@web/common/utils/storage/task.storage.util";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";

interface UseLoadTasksByDateEffectProps {
  dateKey: string;
  setTasksState: Dispatch<SetStateAction<Task[]>>;
  setIsLoadingTasks: Dispatch<SetStateAction<boolean>>;
  setDidLoadFail: Dispatch<SetStateAction<boolean>>;
  setLoadedDateKey: Dispatch<SetStateAction<string | null>>;
  isDirtyRef: MutableRefObject<boolean>;
  loadRequestIdRef: MutableRefObject<number>;
}

export function useLoadTasksByDateEffect({
  dateKey,
  setTasksState,
  setIsLoadingTasks,
  setDidLoadFail,
  setLoadedDateKey,
  isDirtyRef,
  loadRequestIdRef,
}: UseLoadTasksByDateEffectProps) {
  useEffect(() => {
    let isCancelled = false;
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    isDirtyRef.current = false;
    setTasksState([]);
    setLoadedDateKey(null);
    setDidLoadFail(false);
    setIsLoadingTasks(true);

    void loadTasksFromIndexedDB(dateKey)
      .then((loadedTasks) => {
        if (isCancelled || requestId !== loadRequestIdRef.current) return;

        setTasksState(sortTasksByStatus(loadedTasks));
        setLoadedDateKey(dateKey);
        setDidLoadFail(false);
        setIsLoadingTasks(false);
      })
      .catch((error) => {
        if (isCancelled || requestId !== loadRequestIdRef.current) return;

        console.error("Failed to load tasks from IndexedDB:", error);
        setTasksState([]);
        setLoadedDateKey(dateKey);
        setDidLoadFail(true);
        setIsLoadingTasks(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    dateKey,
    isDirtyRef,
    loadRequestIdRef,
    setDidLoadFail,
    setIsLoadingTasks,
    setLoadedDateKey,
    setTasksState,
  ]);
}

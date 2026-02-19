import { Dispatch, MutableRefObject, SetStateAction, useEffect } from "react";
import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { ensureStorageReady } from "@web/common/storage/adapter/adapter";
import { Task } from "@web/common/types/task.types";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";

interface UseLoadTasksByDateEffectProps {
  dateKey: string;
  taskRepository: TaskRepository;
  setTasksState: Dispatch<SetStateAction<Task[]>>;
  setIsLoadingTasks: Dispatch<SetStateAction<boolean>>;
  setDidLoadFail: Dispatch<SetStateAction<boolean>>;
  setLoadedDateKey: Dispatch<SetStateAction<string | null>>;
  isDirtyRef: MutableRefObject<boolean>;
  loadRequestIdRef: MutableRefObject<number>;
}

export function useLoadTasksByDateEffect({
  dateKey,
  taskRepository,
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

    void (async () => {
      await ensureStorageReady();
      return taskRepository.get(dateKey);
    })()
      .then((loadedTasks) => {
        if (isCancelled || requestId !== loadRequestIdRef.current) return;

        setTasksState(sortTasksByStatus(loadedTasks));
        setLoadedDateKey(dateKey);
        setDidLoadFail(false);
        setIsLoadingTasks(false);
      })
      .catch((error) => {
        if (isCancelled || requestId !== loadRequestIdRef.current) return;

        console.error("Failed to load tasks from storage:", error);
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
    taskRepository,
    isDirtyRef,
    loadRequestIdRef,
    setDidLoadFail,
    setIsLoadingTasks,
    setLoadedDateKey,
    setTasksState,
  ]);
}

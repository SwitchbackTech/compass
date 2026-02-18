import { useCallback, useEffect, useRef, useState } from "react";
import { Task, UndoOperation } from "@web/common/types/task.types";
import { getDateKey } from "@web/common/utils/storage/storage.util";
import {
  loadTasksFromIndexedDB,
  saveTasksToIndexedDB,
} from "@web/common/utils/storage/task.storage.util";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";

interface UseTaskStateProps {
  currentDate?: Date;
}

export function useTaskState({
  currentDate = new Date(),
}: UseTaskStateProps = {}) {
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [didLoadFail, setDidLoadFail] = useState(false);
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const isDirtyRef = useRef(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCancellingEdit, setIsCancellingEdit] = useState(false);
  const [undoState, setUndoState] = useState<UndoOperation | null>(null);
  const [undoToastId, setUndoToastId] = useState<string | number | null>(null);

  const dateKey = getDateKey(currentDate);

  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback(
    (nextTasks) => {
      isDirtyRef.current = true;
      setDidLoadFail(false);
      setTasksState(nextTasks);
    },
    [],
  );

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
  }, [dateKey]);

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
  }, [dateKey, didLoadFail, isLoadingTasks, loadedDateKey, tasks]);

  return {
    tasks,
    setTasks,
    isLoadingTasks,
    didLoadFail,
    editingTitle,
    setEditingTitle,
    editingTaskId,
    setEditingTaskId,
    selectedTaskIndex,
    setSelectedTaskIndex,
    isAddingTask,
    setIsAddingTask,
    isCancellingEdit,
    setIsCancellingEdit,
    undoState,
    setUndoState,
    undoToastId,
    setUndoToastId,
    dateKey,
  };
}

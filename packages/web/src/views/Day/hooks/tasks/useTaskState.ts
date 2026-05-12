import { useCallback, useRef, useState } from "react";
import { type TaskRepository } from "@web/common/repositories/task/task.repository";
import { type Task, type UndoOperation } from "@web/common/types/task.types";
import { getDateKey } from "@web/common/utils/storage/storage.util";
import { useLoadTasksByDateEffect } from "@web/views/Day/hooks/tasks/useLoadTasksByDateEffect";
import { useSaveTasksByDateEffect } from "@web/views/Day/hooks/tasks/useSaveTasksByDateEffect";

interface UseTaskStateProps {
  currentDate?: Date;
  taskRepository: TaskRepository;
}

export function useTaskState({
  currentDate = new Date(),
  taskRepository,
}: UseTaskStateProps) {
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
  const isCancellingEditRef = useRef(false);
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

  const startTaskLoad = useCallback(() => {
    setDidLoadFail(false);
    setIsLoadingTasks(true);
  }, []);

  const finishTaskLoad = useCallback(
    (loadedTasks: Task[], nextDateKey: string) => {
      setTasksState(loadedTasks);
      setLoadedDateKey(nextDateKey);
      setDidLoadFail(false);
      setIsLoadingTasks(false);
    },
    [],
  );

  const failTaskLoad = useCallback((nextDateKey: string) => {
    setTasksState([]);
    setLoadedDateKey(nextDateKey);
    setDidLoadFail(true);
    setIsLoadingTasks(false);
  }, []);

  useLoadTasksByDateEffect({
    dateKey,
    taskRepository,
    onTaskLoadFailure: failTaskLoad,
    onTaskLoadStart: startTaskLoad,
    onTaskLoadSuccess: finishTaskLoad,
    isDirtyRef,
    loadRequestIdRef,
  });
  useSaveTasksByDateEffect({
    dateKey,
    tasks,
    taskRepository,
    isLoadingTasks,
    didLoadFail,
    loadedDateKey,
    isDirtyRef,
    saveRequestIdRef,
  });

  return {
    tasks,
    setTasks,
    isLoadingTasks,
    hasLoadedTasksOnce: loadedDateKey !== null,
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
    isCancellingEditRef,
    setIsCancellingEdit,
    undoState,
    setUndoState,
    undoToastId,
    setUndoToastId,
    dateKey,
  };
}

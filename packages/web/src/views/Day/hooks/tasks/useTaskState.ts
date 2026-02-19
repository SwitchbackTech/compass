import { useCallback, useRef, useState } from "react";
import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task, UndoOperation } from "@web/common/types/task.types";
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

  useLoadTasksByDateEffect({
    dateKey,
    taskRepository,
    setTasksState,
    setIsLoadingTasks,
    setDidLoadFail,
    setLoadedDateKey,
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

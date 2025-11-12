import { useRef, useState } from "react";
import { Task, UndoOperation } from "../../task.types";
import { getDateKey } from "../../util/storage.util";

interface UseTaskStateProps {
  currentDate?: Date;
}

export function useTaskState({
  currentDate = new Date(),
}: UseTaskStateProps = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTask, selectTask] = useState<string | undefined>();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCancellingEdit, setIsCancellingEdit] = useState(false);
  const [undoState, setUndoState] = useState<UndoOperation | null>(null);
  const [undoToastId, setUndoToastId] = useState<string | number | null>(null);

  const lastLoadedKeyRef = useRef<string | null>(null);
  const dateKey = getDateKey(currentDate);

  return {
    tasks,
    setTasks,
    editingTitle,
    setEditingTitle,
    editingTaskId,
    setEditingTaskId,
    selectedTask,
    selectTask,
    isAddingTask,
    setIsAddingTask,
    isCancellingEdit,
    setIsCancellingEdit,
    undoState,
    setUndoState,
    undoToastId,
    setUndoToastId,
    lastLoadedKeyRef,
    dateKey,
  };
}

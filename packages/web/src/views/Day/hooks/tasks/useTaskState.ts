import { useState } from "react";
import { Task, UndoOperation } from "../../../../common/types/task.types";
import { getDateKey } from "../../../../common/utils/storage/storage.util";

interface UseTaskStateProps {
  currentDate?: Date;
}

export function useTaskState({
  currentDate = new Date(),
}: UseTaskStateProps = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCancellingEdit, setIsCancellingEdit] = useState(false);
  const [undoState, setUndoState] = useState<UndoOperation | null>(null);
  const [undoToastId, setUndoToastId] = useState<string | number | null>(null);

  const dateKey = getDateKey(currentDate);

  return {
    tasks,
    setTasks,
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

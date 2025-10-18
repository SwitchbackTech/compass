import { useRef, useState } from "react";
import { Task } from "../../task.types";
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
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCancellingEdit, setIsCancellingEdit] = useState(false);
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
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
    selectedTaskIndex,
    setSelectedTaskIndex,
    isAddingTask,
    setIsAddingTask,
    isCancellingEdit,
    setIsCancellingEdit,
    deletedTask,
    setDeletedTask,
    undoToastId,
    setUndoToastId,
    lastLoadedKeyRef,
    dateKey,
  };
}

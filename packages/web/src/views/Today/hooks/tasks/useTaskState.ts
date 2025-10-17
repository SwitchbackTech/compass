import { useRef, useState } from "react";
import { Task } from "../../task.types";
import { getDateKey } from "../../util/storage.util";

interface UseTaskStateProps {
  currentDate?: Date;
}

interface UseTaskStateReturn {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  editingTaskId: string | null;
  setEditingTaskId: (taskId: string | null) => void;
  selectedTaskIndex: number;
  setSelectedTaskIndex: (index: number) => void;
  isAddingTask: boolean;
  setIsAddingTask: (isAdding: boolean) => void;
  isCancellingEdit: boolean;
  setIsCancellingEdit: (isCancelling: boolean) => void;
  lastLoadedKeyRef: React.MutableRefObject<string | null>;
  dateKey: string;
}

export function useTaskState({
  currentDate = new Date(),
}: UseTaskStateProps = {}): UseTaskStateReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCancellingEdit, setIsCancellingEdit] = useState(false);

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
    lastLoadedKeyRef,
    dateKey,
  };
}

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Task } from "@web/common/types/task.types";
import {
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";

export interface UseTasksTodayProps {
  onNext: () => void;
  onNavigationControlChange?: (shouldPrevent: boolean) => void;
}

export interface UseTasksTodayReturn {
  // State
  isTaskCreated: boolean;
  tasks: Task[];
  newTask: string;

  // Handlers
  handleNext: () => void;
  handleAddTask: () => void;
  handleTaskKeyPress: (e: React.KeyboardEvent) => void;

  // Setters
  setNewTask: (value: string) => void;
}

// Constants
export const MAX_TASKS = 20;

const hasUserCreatedTask = (tasks: Task[]): boolean => {
  return tasks.length > 0;
};

// Custom hook for managing task state and operations
export const useTasksToday = ({
  onNext,
  onNavigationControlChange,
}: UseTasksTodayProps): UseTasksTodayReturn => {
  const dateKey = getDateKey();
  const initialTasks = loadTasksFromStorage(dateKey);
  const hasCreatedTask = hasUserCreatedTask(initialTasks);

  // State
  const [isTaskCreated, setIsTaskCreated] = useState(hasCreatedTask);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState("");

  // Navigation prevention effect
  useEffect(() => {
    const hasUnsavedChanges = newTask.trim() !== "";
    const checkboxNotChecked = !isTaskCreated;

    const shouldPrevent = hasUnsavedChanges || checkboxNotChecked;

    if (onNavigationControlChange) {
      onNavigationControlChange(shouldPrevent);
    }
  }, [newTask, isTaskCreated, onNavigationControlChange]);

  // Task management handlers
  const handleAddTask = useCallback(() => {
    if (newTask.trim() && tasks.length < MAX_TASKS) {
      const newTaskObj: Task = {
        id: uuidv4(),
        title: newTask.trim(),
        status: "todo",
        createdAt: new Date().toISOString(),
        order: 0,
      };

      const updatedTasks = [...tasks, newTaskObj];
      setTasks(updatedTasks);
      saveTasksToStorage(dateKey, updatedTasks);
      setNewTask("");

      // Mark task as created
      if (!isTaskCreated) {
        setIsTaskCreated(true);
      }
    }
  }, [newTask, tasks, dateKey, isTaskCreated]);

  // Keyboard event handlers
  const handleTaskKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleAddTask();
      }
    },
    [handleAddTask],
  );

  // Handle next step
  const handleNext = useCallback(() => {
    onNext();
  }, [onNext]);

  return {
    // State
    isTaskCreated,
    tasks,
    newTask,

    // Handlers
    handleNext,
    handleAddTask,
    handleTaskKeyPress,

    // Setters
    setNewTask,
  };
};

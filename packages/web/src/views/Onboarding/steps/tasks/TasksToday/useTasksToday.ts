import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/views/Day/task.types";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/views/Day/util/storage.util";

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
export const MAX_TASKS = 5;

// Initialize with 2-3 pre-existing tasks
const getInitialTasks = (dateKey: string): Task[] => {
  const existingTasks = loadTasksFromStorage(dateKey);
  if (existingTasks.length > 0) {
    return existingTasks;
  }

  // Create initial tasks if none exist
  const initialTasks: Task[] = [
    {
      id: uuidv4(),
      title: "Review project proposal",
      status: "todo",
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: "Write weekly report",
      status: "todo",
      createdAt: new Date().toISOString(),
    },
  ];

  saveTasksToStorage(dateKey, initialTasks);
  return initialTasks;
};

// Custom hook for managing task state and operations
export const useTasksToday = ({
  onNext,
  onNavigationControlChange,
}: UseTasksTodayProps): UseTasksTodayReturn => {
  // Get today's date key
  const today = dayjs().startOf("day").utc();
  const dateKey = today.format("YYYY-MM-DD");

  // Initialize tasks and check if user has already created a task
  const initialTasks = getInitialTasks(dateKey);
  const initialStoredTasks = loadTasksFromStorage(dateKey);
  // More than 2 tasks means user added at least one task beyond the initial two default tasks
  const hasCreatedTask = initialStoredTasks.length > 2;

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

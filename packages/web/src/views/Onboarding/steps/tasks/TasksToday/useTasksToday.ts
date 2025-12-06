import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";
import {
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
export const MAX_TASKS = 5;

// Initial task titles for comparison
const INITIAL_TASK_TITLES = new Set([
  "Review project proposal",
  "Write weekly report",
]);

// Initialize with 2 pre-existing tasks
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
      order: 0,
    },
    {
      id: uuidv4(),
      title: "Write weekly report",
      status: "todo",
      createdAt: new Date().toISOString(),
      order: 0,
    },
  ];

  saveTasksToStorage(dateKey, initialTasks);
  return initialTasks;
};

// Check if user has created any tasks beyond the initial ones
const hasUserCreatedTask = (tasks: Task[]): boolean => {
  // If there are more than 2 tasks, user has definitely created one
  if (tasks.length > 2) {
    return true;
  }
  // If there are exactly 2 tasks, check if they match the initial task titles
  // If any task doesn't match, user has modified/created tasks
  if (tasks.length === 2) {
    const taskTitles = new Set(tasks.map((task) => task.title));
    // If the set of task titles doesn't exactly match initial titles, user has created/modified
    return (
      taskTitles.size !== INITIAL_TASK_TITLES.size ||
      !Array.from(taskTitles).every((title) => INITIAL_TASK_TITLES.has(title))
    );
  }
  // If there are fewer than 2 tasks, something unexpected happened, but assume no user creation
  return false;
};

// Custom hook for managing task state and operations
export const useTasksToday = ({
  onNext,
  onNavigationControlChange,
}: UseTasksTodayProps): UseTasksTodayReturn => {
  const dateKey = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

  // Initialize tasks and check if user has already created a task
  // getInitialTasks loads from storage, so we use its result directly
  const initialTasks = getInitialTasks(dateKey);
  // Check if user has created tasks beyond the initial ones
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

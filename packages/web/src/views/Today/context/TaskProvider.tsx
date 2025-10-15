import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Task, TaskContextValue, isTask } from "../types";

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

const STORAGE_KEY_PREFIX = "compass.today.tasks";

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface TaskProviderProps {
  children: React.ReactNode;
  currentDate?: Date;
}

export function TaskProvider({
  children,
  currentDate = new Date(),
}: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const dateKey = getDateKey(currentDate);

  // Load tasks from localStorage when date changes
  useEffect(() => {
    if (lastLoadedKeyRef.current === dateKey) return;
    lastLoadedKeyRef.current = dateKey;

    try {
      if (typeof window === "undefined") return;

      const storageKey = `${STORAGE_KEY_PREFIX}.${dateKey}`;
      const rawTasks = window.localStorage.getItem(storageKey);

      if (rawTasks) {
        const parsed = JSON.parse(rawTasks);
        if (Array.isArray(parsed)) {
          // Validate each task using the schema
          const validTasks = parsed.filter(isTask);
          setTasks(validTasks);
          return;
        }
      }

      // If no data or invalid data, start fresh
      setTasks([]);
    } catch (error) {
      console.error("Error loading tasks from localStorage:", error);
      setTasks([]);
    }
  }, [dateKey]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const storageKey = `${STORAGE_KEY_PREFIX}.${dateKey}`;
      window.localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (error) {
      console.error("Error saving tasks to localStorage:", error);
    }
  }, [tasks, dateKey]);

  const addTask = (title: string): Task => {
    const newTask: Task = {
      id: `task-${uuidv4()}`,
      title,
      status: "todo",
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  const updateTaskTitle = (taskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, title } : task)),
    );
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) => {
      const updatedTasks = prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "completed" ? "todo" : "completed",
            }
          : task,
      );

      // Move completed tasks to the end
      const incompleteTasks = updatedTasks.filter(
        (task) => task.status !== "completed",
      );
      const completedTasks = updatedTasks.filter(
        (task) => task.status === "completed",
      );

      return [...incompleteTasks, ...completedTasks];
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const value: TaskContextValue = {
    tasks,
    addTask,
    updateTaskTitle,
    toggleTaskStatus,
    deleteTask,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}

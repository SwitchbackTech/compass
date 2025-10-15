import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Task } from "../task.types";
import { sortTasksByStatus } from "../util/sort.task";
import {
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "../util/storage.util";

interface TaskContextValue {
  tasks: Task[];
  addTask: (title: string) => Task;
  updateTaskTitle: (taskId: string, title: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  editInputRef: React.RefObject<HTMLInputElement>;
  editingTitle: string;
  selectedTaskIndex: number;
  setSelectedTaskIndex: (index: number) => void;
  setEditingTitle: (title: string) => void;
  editingTaskId: string | null;
  setEditingTaskId: (taskId: string | null) => void;
}
const TaskContext = createContext<TaskContextValue | undefined>(undefined);

interface TaskProviderProps {
  children: React.ReactNode;
  currentDate?: Date;
}

export function TaskProvider({
  children,
  currentDate = new Date(),
}: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  const editInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const dateKey = getDateKey(currentDate);

  // Load tasks from localStorage when date changes
  useEffect(() => {
    if (lastLoadedKeyRef.current === dateKey) return;
    lastLoadedKeyRef.current = dateKey;

    const loadedTasks = loadTasksFromStorage(dateKey);
    const sortedTasks = sortTasksByStatus(loadedTasks);
    setTasks(sortedTasks);
  }, [dateKey]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    saveTasksToStorage(dateKey, tasks);
  }, [tasks, dateKey]);

  const addTask = (title: string): Task => {
    const newTask: Task = {
      id: `task-${uuidv4()}`,
      title,
      status: "todo",
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => sortTasksByStatus([...prev, newTask]));
    return newTask;
  };

  const updateTaskTitle = (taskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, title } : task)),
    );
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) => {
      const updatedTasks = prev.map((task) => {
        if (task.id === taskId) {
          const newStatus: "todo" | "completed" =
            task.status === "completed" ? "todo" : "completed";
          return { ...task, status: newStatus };
        }
        return task;
      });

      return sortTasksByStatus(updatedTasks);
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
    editInputRef,
    editingTitle,
    setEditingTitle,
    editingTaskId,
    setEditingTaskId,
    selectedTaskIndex,
    setSelectedTaskIndex,
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

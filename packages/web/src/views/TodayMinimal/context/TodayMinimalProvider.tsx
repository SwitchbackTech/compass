import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Task, TimeBlock, TodayMinimalContextValue } from "../types";

const TodayMinimalContext = createContext<TodayMinimalContextValue | undefined>(
  undefined,
);

function useTodayMinimalState() {
  const STORAGE = {
    tasks: "compass.todayMinimal.tasks",
    timeBlocks: "compass.todayMinimal.timeBlocks",
  } as const;

  const isoOf = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayIso = isoOf(new Date());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const getNow = () => {
    try {
      if (typeof window !== "undefined") {
        const anyWin = window as any;
        if (anyWin.__TEST_TIME__) {
          return new Date(anyWin.__TEST_TIME__);
        }
      }
    } catch {}
    return new Date();
  };

  const [currentTime, setCurrentTime] = useState<Date>(getNow());
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);

  // Mock initial data for development
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title:
        "Add timeout to initial sync that let user get into the app when there's error",
      priority: "Work",
      status: "in-progress",
      estimatedTime: 25,
      actualTime: 0,
      category: "Development",
      isTracking: true,
    },
    {
      id: "2",
      title: "Add block steam games to FAQ",
      priority: "Work",
      status: "todo",
      estimatedTime: 25,
      actualTime: 0,
      category: "Documentation",
    },
    {
      id: "3",
      title:
        "Show alert that there will be duplicate session when automatically break session has ended called",
      priority: "Work",
      status: "todo",
      estimatedTime: 25,
      actualTime: 0,
      category: "Development",
    },
    {
      id: "4",
      title: "Call mom to check in",
      priority: "Relationships",
      status: "todo",
      estimatedTime: 15,
      actualTime: 0,
      category: "Personal",
    },
    {
      id: "5",
      title: "Go for a 30-minute walk",
      priority: "Self",
      status: "todo",
      estimatedTime: 30,
      actualTime: 0,
      category: "Health",
    },
  ]);

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    {
      id: "block-1",
      title: "Morning standup",
      startTime: "09:00",
      endTime: "09:30",
      category: "Meeting",
      priority: "Work",
      type: "event",
      status: "todo",
    },
    {
      id: "block-2",
      title: "Deep work session",
      startTime: "10:00",
      endTime: "12:00",
      category: "Development",
      priority: "Work",
      type: "event",
      status: "todo",
    },
    {
      id: "block-3",
      title: "Lunch break",
      startTime: "12:00",
      endTime: "13:00",
      category: "Break",
      priority: "Self",
      type: "event",
      status: "todo",
    },
    {
      id: "block-4",
      title: "Code review",
      startTime: "14:00",
      endTime: "15:00",
      category: "Development",
      priority: "Work",
      type: "event",
      status: "todo",
    },
  ]);

  // Load data from localStorage when date changes
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const dateKey = isoOf(currentDate);
      const tasksKey = `${STORAGE.tasks}.${dateKey}`;
      const timeBlocksKey = `${STORAGE.timeBlocks}.${dateKey}`;

      const savedTasks = window.localStorage.getItem(tasksKey);
      const savedTimeBlocks = window.localStorage.getItem(timeBlocksKey);

      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks);
        }
      }

      if (savedTimeBlocks) {
        const parsedTimeBlocks = JSON.parse(savedTimeBlocks);
        if (Array.isArray(parsedTimeBlocks)) {
          setTimeBlocks(parsedTimeBlocks);
        }
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
  }, [currentDate]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const dateKey = isoOf(currentDate);
      const tasksKey = `${STORAGE.tasks}.${dateKey}`;
      const timeBlocksKey = `${STORAGE.timeBlocks}.${dateKey}`;

      window.localStorage.setItem(tasksKey, JSON.stringify(tasks));
      window.localStorage.setItem(timeBlocksKey, JSON.stringify(timeBlocks));
    } catch (error) {
      console.error("Error saving data to localStorage:", error);
    }
  }, [tasks, timeBlocks, currentDate]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getNow());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Task management functions
  const addTask = (
    title: string,
    priority: Task["priority"] = "Work",
    category: string = "General",
  ): Task => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      priority,
      status: "todo",
      estimatedTime: 0,
      actualTime: 0,
      category,
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
              status:
                task.status === "completed" ? "todo" : ("completed" as const),
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

  // Time block management functions
  const addTimeBlock = (
    startTime: string,
    endTime: string,
    title: string = "",
  ): TimeBlock => {
    const newTimeBlock: TimeBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      startTime,
      endTime,
      category: "General",
      priority: "Work",
      type: "event",
      status: "todo",
    };
    setTimeBlocks((prev) => [...prev, newTimeBlock]);
    return newTimeBlock;
  };

  const updateTimeBlockTitle = (blockId: string, title: string) => {
    setTimeBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, title } : block)),
    );
  };

  const updateTimeBlockPriority = (
    blockId: string,
    priority: TimeBlock["priority"],
  ) => {
    setTimeBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, priority } : block,
      ),
    );
  };

  const deleteTimeBlock = (blockId: string) => {
    setTimeBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  return {
    // Tasks
    tasks,
    addTask,
    updateTaskTitle,
    toggleTaskStatus,
    deleteTask,
    setFocusedTask,
    focusedTask,

    // Time blocks
    timeBlocks,
    addTimeBlock,
    updateTimeBlockTitle,
    updateTimeBlockPriority,
    deleteTimeBlock,
    setTimeBlocks,

    // Current time
    currentTime,
    setCurrentTime,

    // Current date
    currentDate,
    setCurrentDate,
  };
}

interface TodayMinimalProviderProps {
  children: React.ReactNode;
}

export function TodayMinimalProvider({ children }: TodayMinimalProviderProps) {
  const value = useTodayMinimalState();
  return (
    <TodayMinimalContext.Provider value={value}>
      {children}
    </TodayMinimalContext.Provider>
  );
}

export function useTodayMinimal(): TodayMinimalContextValue {
  const context = useContext(TodayMinimalContext);
  if (!context) {
    throw new Error(
      "useTodayMinimal must be used within a TodayMinimalProvider",
    );
  }
  return context;
}

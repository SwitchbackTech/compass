export interface Task {
  id: string;
  title: string;
  priority: "Work" | "Self" | "Relationships";
  status: "todo" | "in-progress" | "completed";
  estimatedTime: number;
  actualTime: number;
  category: string;
  isTracking?: boolean;
  isEditing?: boolean;
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  taskId?: string;
  category: string;
  isWrapUp?: boolean;
  type?: "event" | "task";
  status?: "todo" | "completed";
  priority?: "Work" | "Self" | "Relationships";
}

export interface TodayMinimalContextValue {
  // Tasks
  tasks: Task[];
  addTask: (
    title: string,
    priority?: Task["priority"],
    category?: string,
  ) => Task;
  updateTaskTitle: (taskId: string, title: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  setFocusedTask: (task: Task | null) => void;
  focusedTask: Task | null;

  // Time blocks (calendar events)
  timeBlocks: TimeBlock[];
  addTimeBlock: (
    startTime: string,
    endTime: string,
    title?: string,
  ) => TimeBlock;
  updateTimeBlockTitle: (blockId: string, title: string) => void;
  updateTimeBlockPriority: (
    blockId: string,
    priority: TimeBlock["priority"],
  ) => void;
  deleteTimeBlock: (blockId: string) => void;
  setTimeBlocks: React.Dispatch<React.SetStateAction<TimeBlock[]>>;

  // Current time
  currentTime: Date;
  setCurrentTime: React.Dispatch<React.SetStateAction<Date>>;

  // Current date
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

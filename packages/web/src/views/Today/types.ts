export interface Task {
  id: string;
  title: string;
  priority: "Work" | "Self" | "Relationships";
  status: "todo" | "completed";
  createdAt: string;
}

export interface TaskContextValue {
  tasks: Task[];
  addTask: (title: string, priority?: Task["priority"]) => Task;
  updateTaskTitle: (taskId: string, title: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}

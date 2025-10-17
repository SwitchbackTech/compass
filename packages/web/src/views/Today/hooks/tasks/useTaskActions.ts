import { v4 as uuidv4 } from "uuid";
import { Task } from "../../task.types";
import { sortTasksByStatus } from "../../util/sort.task";

interface UseTaskActionsProps {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

interface UseTaskActionsReturn {
  addTask: (title: string) => Task;
  updateTaskTitle: (taskId: string, title: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}

export function useTaskActions({
  setTasks,
}: UseTaskActionsProps): UseTaskActionsReturn {
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

  return {
    addTask,
    updateTaskTitle,
    toggleTaskStatus,
    deleteTask,
  };
}

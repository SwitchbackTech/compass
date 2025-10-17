import { v4 as uuidv4 } from "uuid";
import { Task } from "../../task.types";
import { sortTasksByStatus } from "../../util/sort.task";

interface UseTaskActionsProps {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  tasks: Task[];
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  setEditingTaskId: (taskId: string | null) => void;
  isCancellingEdit: boolean;
  setIsCancellingEdit: (isCancelling: boolean) => void;
}

export function useTaskActions({
  setTasks,
  tasks,
  editingTitle,
  setEditingTitle,
  setEditingTaskId,
  isCancellingEdit,
  setIsCancellingEdit,
}: UseTaskActionsProps) {
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

  const focusOnCheckbox = (index: number) => {
    const checkbox = document.querySelector(
      `button[aria-label="Toggle ${tasks[index].title}"]`,
    ) as HTMLButtonElement;
    if (checkbox) {
      checkbox.focus();
    }
  };

  const focusOnInput = (title: string) => {
    const input = document.querySelector(
      `input[aria-label="Edit ${title}"]`,
    ) as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const focusOnInputByIndex = (index: number) => {
    // Check if index is valid and task exists
    if (index < 0 || index >= tasks.length || !tasks[index]) {
      console.warn(
        `focusOnInputByIndex: Invalid index ${index}, tasks length: ${tasks.length}`,
      );
      return;
    }

    const task = tasks[index];
    focusOnInput(task.title);
  };

  const onCheckboxKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleTaskStatus(taskId);
    } else if (e.key.toLocaleLowerCase() === "e") {
      e.preventDefault();
      e.stopPropagation();

      setEditingTaskId(taskId);
      setEditingTitle(title);

      setTimeout(() => {
        focusOnInput(title);
      }, 0);
    }
  };

  const onInputBlur = (taskId: string) => {
    if (isCancellingEdit) {
      // Don't update the task title if we're canceling the edit
      setIsCancellingEdit(false);
      return;
    }

    // Find the current task to check if it has been reverted
    const currentTask = tasks.find((task) => task.id === taskId);
    const title = editingTitle.trim();
    const shouldUpdateTitle =
      currentTask && title && title !== currentTask.title;

    if (shouldUpdateTitle) {
      updateTaskTitle(taskId, title);
    }
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const onInputClick = (taskId: string) => {
    setEditingTaskId(taskId);
    setEditingTitle(tasks.find((task) => task.id === taskId)?.title || "");
  };

  const onInputKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedTitle = editingTitle.trim();
      if (trimmedTitle === "") {
        // Delete task if title is empty
        deleteTask(tasks[index].id);
      } else {
        // Update task with new title
        updateTaskTitle(taskId, trimmedTitle);
      }
      setEditingTaskId(null);
      setEditingTitle("");
      focusOnCheckbox(index);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Get the original task title and revert to it
      const originalTask = tasks.find((task) => task.id === taskId);
      if (originalTask) {
        // Use setTimeout to ensure this runs after the blur event
        setTimeout(() => {
          updateTaskTitle(taskId, originalTask.title);
        }, 0);
      }
      // Clear editing state
      setEditingTaskId(null);
      setEditingTitle("");
      focusOnCheckbox(index);
    }
  };

  return {
    addTask,
    updateTaskTitle,
    toggleTaskStatus,
    deleteTask,
    focusOnCheckbox,
    focusOnInputByIndex,
    onCheckboxKeyDown,
    onInputBlur,
    onInputClick,
    onInputKeyDown,
  };
}

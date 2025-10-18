import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { showUndoDeleteToast } from "../../components/UndoToast/UndoDeleteToast";
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
  deletedTask: Task | null;
  setDeletedTask: (task: Task | null) => void;
  undoToastId: string | number | null;
  setUndoToastId: (toastId: string | number | null) => void;
}

export function useTaskActions({
  setTasks,
  tasks,
  editingTitle,
  setEditingTitle,
  setEditingTaskId,
  isCancellingEdit,
  setIsCancellingEdit,
  deletedTask,
  setDeletedTask,
  undoToastId,
  setUndoToastId,
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

  const restoreTask = useCallback(() => {
    if (!deletedTask) return;

    // Add the task back to the list
    setTasks((prev) => sortTasksByStatus([...prev, deletedTask]));

    // Clear the deleted task state
    setDeletedTask(null);

    // Clear the toast ID
    setUndoToastId(null);
  }, [deletedTask, setTasks, setDeletedTask, setUndoToastId]);

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((task) => task.id === taskId);
    if (!taskToDelete) return;

    // Store the deleted task for potential restoration
    setDeletedTask(taskToDelete);

    // Remove task from the list
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    // Show undo toast with a fresh restore function and capture the toast ID
    const toastId = showUndoDeleteToast(taskToDelete, () => {
      // Create a fresh restore function that captures the current taskToDelete
      setTasks((prev) => sortTasksByStatus([...prev, taskToDelete]));
      setDeletedTask(null);
      setUndoToastId(null);
    });

    // Store the toast ID for potential dismissal
    setUndoToastId(toastId);
  };

  const focusOnCheckbox = (taskId: string) => {
    const checkbox = document.querySelector(
      `button[data-task-id="${taskId}"]`,
    ) as HTMLButtonElement;
    if (checkbox) {
      checkbox.focus();
    }
  };

  const focusOnInput = (taskId: string) => {
    const input = document.querySelector(
      `input[data-task-id="${taskId}"]`,
    ) as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const onCheckboxKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleTaskStatus(taskId);
    } else if (e.key.toLowerCase() === "e") {
      e.preventDefault();
      e.stopPropagation();

      setEditingTaskId(taskId);
      setEditingTitle(title);

      setTimeout(() => {
        focusOnInput(taskId);
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

  const onInputKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedTitle = editingTitle.trim();
      if (trimmedTitle === "") {
        // Delete task if title is empty
        deleteTask(taskId);
      } else {
        // Update task with new title
        updateTaskTitle(taskId, trimmedTitle);
      }
      setEditingTaskId(null);
      setEditingTitle("");
      focusOnCheckbox(taskId);
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
      focusOnCheckbox(taskId);
    }
  };

  return {
    addTask,
    updateTaskTitle,
    toggleTaskStatus,
    deleteTask,
    restoreTask,
    focusOnCheckbox,
    focusOnInput,
    onCheckboxKeyDown,
    onInputBlur,
    onInputClick,
    onInputKeyDown,
  };
}

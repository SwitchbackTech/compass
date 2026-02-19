import dayjs from "dayjs";
import { useCallback } from "react";
import { toast } from "react-toastify";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task, UndoOperation } from "@web/common/types/task.types";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { getDateKey } from "@web/common/utils/storage/storage.util";
import { sortTasksByStatus } from "@web/common/utils/task/sort.task";
import { showMigrationToast } from "@web/views/Day/components/Toasts/MigrationToast/MigrationToast";
import { showUndoDeleteToast } from "@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast";

interface UseTaskActionsProps {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  tasks: Task[];
  taskRepository: TaskRepository;
  isLoadingTasks?: boolean;
  editingTitle?: string;
  setEditingTitle?: (title: string) => void;
  setEditingTaskId?: (taskId: string | null) => void;
  isCancellingEdit?: boolean;
  setIsCancellingEdit?: (isCancelling: boolean) => void;
  undoState?: UndoOperation | null;
  setUndoState?: (state: UndoOperation | null) => void;
  undoToastId?: string | number | null;
  setUndoToastId?: (toastId: string | number | null) => void;
  dateInView?: dayjs.Dayjs;
  navigateToNextDay?: () => void;
  navigateToPreviousDay?: () => void;
}

export function useTaskActions({
  setTasks,
  tasks,
  taskRepository,
  isLoadingTasks,
  editingTitle,
  setEditingTitle,
  setEditingTaskId,
  isCancellingEdit,
  setIsCancellingEdit,
  undoState,
  setUndoState,
  undoToastId,
  setUndoToastId,
  dateInView,
  navigateToNextDay,
  navigateToPreviousDay,
}: UseTaskActionsProps) {
  const isEditingBlocked = Boolean(isLoadingTasks);

  const addTask = (title: string): Task => {
    const newTask: Task = {
      _id: createObjectIdString(),
      title,
      status: "todo",
      order: tasks.length,
      createdAt: new Date().toISOString(),
      user: UNAUTHENTICATED_USER,
    };

    setTasks((prev) => sortTasksByStatus([...prev, newTask]));
    return newTask;
  };

  const updateTaskTitle = (taskId: string, title: string) => {
    if (isEditingBlocked) return;

    setTasks((prev) =>
      prev.map((task) => (task._id === taskId ? { ...task, title } : task)),
    );
  };

  const updateTaskDescription = (taskId: string, description: string) => {
    if (isEditingBlocked) return;

    setTasks((prev) =>
      prev.map((task) =>
        task._id === taskId ? { ...task, description } : task,
      ),
    );
  };

  const toggleTaskStatus = (taskId: string) => {
    if (isEditingBlocked) return;

    setTasks((prev) => {
      const updatedTasks = prev.map((task) => {
        if (task._id === taskId) {
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
    if (isEditingBlocked) return;
    if (!undoState) return;

    if (undoState.type === "delete") {
      // Restore deleted task
      setTasks((prev) => sortTasksByStatus([...prev, undoState.task]));
    } else if (
      undoState.type === "migrate" &&
      undoState.fromDate &&
      undoState.direction &&
      dateInView
    ) {
      const currentDateKey = getDateKey(dateInView.toDate());

      // Only restore if we're still on the same date where the migration happened
      if (currentDateKey === undoState.fromDate) {
        // Add the task back to the list
        setTasks((prev) => sortTasksByStatus([...prev, undoState.task]));

        // Calculate the target date (where the task was migrated to)
        const targetDate = dateInView.add(
          undoState.direction === "forward" ? 1 : -1,
          "day",
        );
        const targetDateKey = getDateKey(targetDate.toDate());

        // Async storage operations (fire and forget since we're in a callback)
        const restoreInStorage = async () => {
          try {
            // Remove the task from the target date in storage
            const targetDateTasks = await taskRepository.get(targetDateKey);
            const updatedTargetTasks = targetDateTasks.filter(
              (t: Task) => t._id !== undoState.task._id,
            );
            await taskRepository.save(targetDateKey, updatedTargetTasks);

            // Restore the task to the original date in storage.
            const originalDateTasks = await taskRepository.get(
              undoState.fromDate,
            );
            const alreadyExists = originalDateTasks.some(
              (task) => task._id === undoState.task._id,
            );
            if (!alreadyExists) {
              await taskRepository.save(undoState.fromDate, [
                ...originalDateTasks,
                undoState.task,
              ]);
            }
          } catch (error) {
            console.error("Failed to restore task in repository:", error);
          }
        };
        restoreInStorage();
      }
    }

    // Clear the undo state
    setUndoState?.(null);
    setUndoToastId?.(null);
  }, [
    undoState,
    dateInView,
    setUndoState,
    setUndoToastId,
    setTasks,
    taskRepository,
    isEditingBlocked,
  ]);

  const deleteTask = (taskId: string) => {
    if (isEditingBlocked) return;

    const taskToDelete = tasks.find((task) => task._id === taskId);
    if (!taskToDelete) return;

    // Dismiss any existing undo toast before showing new one
    if (undoToastId) {
      toast.dismiss(undoToastId);
    }

    // Store the deleted task in unified undo state
    setUndoState?.({ type: "delete", task: taskToDelete });

    // Remove task from the list
    setTasks((prev) => prev.filter((task) => task._id !== taskId));

    const toastId = showUndoDeleteToast(restoreTask);

    // Store the toast ID for potential dismissal
    setUndoToastId?.(toastId);
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
      const length = input.value.length;

      input.focus();
      input.setSelectionRange(length, length);
    }
  };

  const onCheckboxKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => {
    if (isEditingBlocked) return;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleTaskStatus(taskId);
    } else if (e.key.toLowerCase() === "e") {
      e.preventDefault();
      e.stopPropagation();

      setEditingTaskId?.(taskId);
      setEditingTitle?.(title);

      setTimeout(() => {
        focusOnInput(taskId);
      }, 0);
    }
  };

  const onInputBlur = (taskId: string) => {
    if (isEditingBlocked) return;

    if (isCancellingEdit) {
      // Don't update the task title if we're canceling the edit
      setIsCancellingEdit?.(false);
      return;
    }

    // Find the current task to check if it has been reverted
    const currentTask = tasks.find((task) => task._id === taskId);
    const title = editingTitle?.trim() || "";
    const shouldUpdateTitle =
      currentTask && title && title !== currentTask.title;

    if (shouldUpdateTitle) {
      updateTaskTitle(taskId, title);
    }
    setEditingTaskId?.(null);
    setEditingTitle?.("");
  };

  const onInputClick = (taskId: string) => {
    if (isEditingBlocked) return;

    setEditingTaskId?.(taskId);
    setEditingTitle?.(tasks.find((task) => task._id === taskId)?.title || "");
  };

  const onInputKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (isEditingBlocked) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedTitle = editingTitle?.trim() || "";
      if (trimmedTitle === "") {
        // Delete task if title is empty
        deleteTask(taskId);
      } else {
        // Update task with new title
        updateTaskTitle(taskId, trimmedTitle);
      }
      setEditingTaskId?.(null);
      setEditingTitle?.("");
      focusOnCheckbox(taskId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Get the original task title and revert to it
      const originalTask = tasks.find((task) => task._id === taskId);
      if (originalTask) {
        // Use setTimeout to ensure this runs after the blur event
        setTimeout(() => {
          updateTaskTitle(taskId, originalTask.title);
        }, 0);
      }
      // Clear editing state
      setEditingTaskId?.(null);
      setEditingTitle?.("");
      focusOnCheckbox(taskId);
    }
  };

  const reorderTasks = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      if (isEditingBlocked) return;

      setTasks((prev) => {
        const newTasks = Array.from(prev);
        const [moved] = newTasks.splice(sourceIndex, 1);
        newTasks.splice(destinationIndex, 0, moved);

        const todoTasks = newTasks.filter((t) => t.status === "todo");
        const completedTasks = newTasks.filter((t) => t.status === "completed");

        const todoOrderById = new Map(
          todoTasks.map((task, index) => [task._id, index]),
        );
        const completedOrderById = new Map(
          completedTasks.map((task, index) => [task._id, index]),
        );

        return newTasks.map((task) => {
          const order =
            task.status === "todo"
              ? (todoOrderById.get(task._id) ?? 0)
              : (completedOrderById.get(task._id) ?? 0);
          return { ...task, order };
        });
      });
    },
    [setTasks, isEditingBlocked],
  );

  const migrateTask = useCallback(
    (taskId: string, direction: "forward" | "backward") => {
      if (isEditingBlocked) return;
      if (!dateInView) return;

      const taskToMigrate = tasks.find((task) => task._id === taskId);
      if (!taskToMigrate) return;

      // Dismiss any existing undo toast before showing new one
      if (undoToastId) {
        toast.dismiss(undoToastId);
      }

      // Calculate target date
      const currentDateKey = getDateKey(dateInView.toDate());
      const targetDate =
        direction === "forward"
          ? dateInView.add(1, "day")
          : dateInView.subtract(1, "day");
      const targetDateKey = getDateKey(targetDate.toDate());

      // Store the migrated task operation
      setUndoState?.({
        type: "migrate",
        task: taskToMigrate,
        fromDate: currentDateKey,
        direction,
      });

      // Move task in storage (async, fire and forget)
      taskRepository
        .move(taskToMigrate, currentDateKey, targetDateKey)
        .catch((error) => {
          console.error("Failed to move task in storage:", error);
        });

      // Remove from current view
      setTasks((prev) => prev.filter((task) => task._id !== taskId));

      // Show toast with navigation and undo options
      const onNavigate =
        direction === "forward" ? navigateToNextDay : navigateToPreviousDay;
      if (onNavigate) {
        const toastId = showMigrationToast(direction, onNavigate, restoreTask);
        setUndoToastId?.(toastId);
      }
    },
    [
      tasks,
      dateInView,
      setTasks,
      navigateToNextDay,
      navigateToPreviousDay,
      undoToastId,
      setUndoState,
      setUndoToastId,
      restoreTask,
      taskRepository,
      isEditingBlocked,
    ],
  );

  return {
    addTask,
    updateTaskTitle,
    updateTaskDescription,
    toggleTaskStatus,
    deleteTask,
    restoreTask,
    focusOnCheckbox,
    focusOnInput,
    onCheckboxKeyDown,
    onInputBlur,
    onInputClick,
    onInputKeyDown,
    migrateTask,
    reorderTasks,
  };
}

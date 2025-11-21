import React, { createContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { Task } from "@web/common/types/task.types";
import { updateTodayTasks } from "@web/common/utils/storage/storage.util";
import { getIncompleteTasksSorted } from "@web/common/utils/task/sort.task";
import { useAvailableTasks } from "../hooks/useAvailableTasks";
import { useFocusedTask } from "../hooks/useFocusedTask";
import { useNowShortcuts } from "../shortcuts/useNowShortcuts";

interface NowViewContextValue {
  focusedTask: Task | null;
  setFocusedTask: (taskId: string | null) => void;
  availableTasks: Task[];
  hasCompletedTasks: boolean;
  handlePreviousTask: () => void;
  handleNextTask: () => void;
  handleCompleteTask: () => void;
  updateTaskDescription: (taskId: string, description: string) => void;
}

export const NowViewContext = createContext<NowViewContextValue | undefined>(
  undefined,
);

interface NowViewProviderProps {
  children: React.ReactNode;
}

export function NowViewProvider({ children }: NowViewProviderProps) {
  const navigate = useNavigate();
  const { availableTasks, hasCompletedTasks } = useAvailableTasks();
  const { focusedTask, setFocusedTask } = useFocusedTask({ availableTasks });
  const completeFocusedTask = useCallback((taskId: string) => {
    return updateTodayTasks((tasks) =>
      tasks.map((task) =>
        task.id === taskId ? { ...task, status: "completed" as const } : task,
      ),
    );
  }, []);

  const updateTaskDescription = useCallback(
    (taskId: string, description: string) => {
      updateTodayTasks((tasks) =>
        tasks.map((task) =>
          task.id === taskId ? { ...task, description } : task,
        ),
      );
    },
    [],
  );

  const handlePreviousTask = useCallback(() => {
    if (!focusedTask || availableTasks.length === 0) return;

    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );

    if (currentTaskIndex === -1) return;

    // Wrap around: if at first task, go to last task
    const previousIndex =
      currentTaskIndex === 0 ? availableTasks.length - 1 : currentTaskIndex - 1;

    setFocusedTask(availableTasks[previousIndex].id);
  }, [focusedTask, availableTasks, setFocusedTask]);

  const handleNextTask = useCallback(() => {
    if (!focusedTask || availableTasks.length === 0) return;

    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );

    if (currentTaskIndex === -1) return;

    // Wrap around: if at last task, go to first task
    const nextIndex =
      currentTaskIndex === availableTasks.length - 1 ? 0 : currentTaskIndex + 1;

    setFocusedTask(availableTasks[nextIndex].id);
  }, [focusedTask, availableTasks, setFocusedTask]);

  const handleCompleteTask = useCallback(() => {
    if (!focusedTask) return;

    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );
    const updatedTasks = completeFocusedTask(focusedTask.id);
    const incompleteTasks = getIncompleteTasksSorted(updatedTasks);

    if (incompleteTasks.length === 0) {
      navigate(ROOT_ROUTES.DAY);
      return;
    }

    const nextTask = getNextTaskAfterCompletion({
      availableTasks,
      incompleteTasks,
      currentTaskIndex,
    });

    if (nextTask) {
      setFocusedTask(nextTask.id);
      return;
    }

    setFocusedTask(incompleteTasks[0].id);
  }, [
    availableTasks,
    completeFocusedTask,
    focusedTask,
    navigate,
    setFocusedTask,
  ]);

  // Single call to useNowShortcuts at provider level
  useNowShortcuts({
    focusedTask,
    availableTasks,
    onPreviousTask: handlePreviousTask,
    onNextTask: handleNextTask,
    onCompleteTask: handleCompleteTask,
  });

  const value: NowViewContextValue = {
    focusedTask,
    setFocusedTask,
    availableTasks,
    hasCompletedTasks,
    handlePreviousTask,
    handleNextTask,
    handleCompleteTask,
    updateTaskDescription,
  };

  return (
    <NowViewContext.Provider value={value}>{children}</NowViewContext.Provider>
  );
}

interface NextTaskParams {
  availableTasks: Task[];
  incompleteTasks: Task[];
  currentTaskIndex: number;
}

function getNextTaskAfterCompletion({
  availableTasks,
  incompleteTasks,
  currentTaskIndex,
}: NextTaskParams): Task | null {
  if (currentTaskIndex >= 0 && currentTaskIndex < availableTasks.length - 1) {
    const nextTaskId = availableTasks[currentTaskIndex + 1].id;
    return incompleteTasks.find((task) => task.id === nextTaskId) ?? null;
  }

  if (currentTaskIndex > 0) {
    const previousTaskId = availableTasks[currentTaskIndex - 1].id;
    return incompleteTasks.find((task) => task.id === previousTaskId) ?? null;
  }

  return incompleteTasks[0] ?? null;
}

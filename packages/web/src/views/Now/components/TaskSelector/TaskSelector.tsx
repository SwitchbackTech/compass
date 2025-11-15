import { useNavigate } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { getIncompleteTasksSorted } from "@web/views/Day/util/sort.task";
import {
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/views/Day/util/storage.util";
import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { useTaskFocus } from "@web/views/Now/hooks/useTaskFocus";
import { useNowViewShortcuts } from "@web/views/Now/shortcuts/useNowViewShortcuts";
import { AllTasksCompleted } from "../AllTasksCompleted/AllTasksCompleted";
import { AvailableTasks } from "../AvailableTasks/AvailableTasks";
import { FocusedTask } from "../FocusedTask/FocusedTask";

export const TaskSelector = () => {
  const navigate = useNavigate();
  const { focusedTask, setFocusedTask } = useFocusedTask();
  const { availableTasks, hasCompletedTasks } = useAvailableTasks();

  useTaskFocus({
    focusedTask,
    availableTasks,
    setFocusedTask,
  });

  const handlePreviousTask = () => {
    if (!focusedTask || availableTasks.length === 0) return;

    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );

    if (currentTaskIndex === -1) return;

    // Wrap around: if at first task, go to last task
    const previousIndex =
      currentTaskIndex === 0 ? availableTasks.length - 1 : currentTaskIndex - 1;

    setFocusedTask(availableTasks[previousIndex].id);
  };

  const handleNextTask = () => {
    if (!focusedTask || availableTasks.length === 0) return;

    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );

    if (currentTaskIndex === -1) return;

    // Wrap around: if at last task, go to first task
    const nextIndex =
      currentTaskIndex === availableTasks.length - 1 ? 0 : currentTaskIndex + 1;

    setFocusedTask(availableTasks[nextIndex].id);
  };

  useNowViewShortcuts({
    focusedTask,
    availableTasks,
    onPreviousTask: handlePreviousTask,
    onNextTask: handleNextTask,
  });

  const handleCompleteTask = () => {
    if (!focusedTask) return;

    // Find the current task's index in availableTasks before completing it
    // We need this to determine navigation direction
    const currentTaskIndex = availableTasks.findIndex(
      (task) => task.id === focusedTask.id,
    );

    // Mark the current task as completed
    const today = dayjs().utc();
    const dateKey = getDateKey(today.toDate());
    const tasks = loadTasksFromStorage(dateKey);
    const updatedTasks = tasks.map((task) =>
      task.id === focusedTask.id
        ? { ...task, status: "completed" as const }
        : task,
    );
    saveTasksToStorage(dateKey, updatedTasks);

    // Filter incomplete tasks from updatedTasks (same logic as useAvailableTasks)
    // This ensures we use fresh data instead of stale availableTasks state
    const incompleteTasks = getIncompleteTasksSorted(updatedTasks);

    // If this was the last task, navigate to Day view
    if (incompleteTasks.length === 0) {
      navigate(ROOT_ROUTES.DAY);
      return;
    }

    // Determine the next task to focus using the fresh incompleteTasks list
    // Find the next/previous task by ID from availableTasks, then locate it in incompleteTasks
    // This ensures we use the correct navigation direction regardless of array order differences
    if (currentTaskIndex >= 0 && currentTaskIndex < availableTasks.length - 1) {
      // Next task exists in availableTasks - find it in incompleteTasks
      const nextTaskId = availableTasks[currentTaskIndex + 1].id;
      const nextTask = incompleteTasks.find((task) => task.id === nextTaskId);
      if (nextTask) {
        setFocusedTask(nextTask.id);
      } else {
        // Fallback: focus on the first available task
        setFocusedTask(incompleteTasks[0].id);
      }
    } else if (currentTaskIndex > 0) {
      // Previous task exists (we were at the end, go to previous)
      const previousTaskId = availableTasks[currentTaskIndex - 1].id;
      const previousTask = incompleteTasks.find(
        (task) => task.id === previousTaskId,
      );
      if (previousTask) {
        setFocusedTask(previousTask.id);
      } else {
        // Fallback: focus on the last available task
        setFocusedTask(incompleteTasks[incompleteTasks.length - 1].id);
      }
    } else {
      // Fallback: focus on the first available task
      if (incompleteTasks.length > 0) {
        setFocusedTask(incompleteTasks[0].id);
      } else {
        setFocusedTask(null);
      }
    }
  };

  if (focusedTask) {
    return (
      <FocusedTask
        task={focusedTask}
        onCompleteTask={handleCompleteTask}
        onPreviousTask={handlePreviousTask}
        onNextTask={handleNextTask}
      />
    );
  }

  if (hasCompletedTasks) {
    return <AllTasksCompleted />;
  }

  if (availableTasks.length === 0) {
    return null;
  }

  return (
    <AvailableTasks tasks={availableTasks} onTaskSelect={setFocusedTask} />
  );
};

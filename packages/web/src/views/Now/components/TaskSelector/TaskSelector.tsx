import { useNavigate } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/views/Day/util/storage.util";
import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { useTaskFocus } from "@web/views/Now/hooks/useTaskFocus";
import { AllTasksCompleted } from "../AllTasksCompleted/AllTasksCompleted";
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

  const handleCompleteTask = () => {
    if (!focusedTask) return;

    // Find the current task's index in availableTasks before completing it
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

    console.log("availableTasks", availableTasks);
    // If this is the last task, navigate to Day view
    if (availableTasks.length === 1) {
      navigate(ROOT_ROUTES.DAY);
      return;
    }

    // Find the next incomplete task
    // If there's a next task in the availableTasks list, focus on it
    if (currentTaskIndex >= 0 && currentTaskIndex < availableTasks.length - 1) {
      // Next task exists
      setFocusedTask(availableTasks[currentTaskIndex + 1].id);
    } else if (currentTaskIndex > 0) {
      // Previous task exists (we're at the end, go to previous)
      setFocusedTask(availableTasks[currentTaskIndex - 1].id);
    } else {
      // No more incomplete tasks
      setFocusedTask(null);
      console.log("No more incomplete tasks");
    }
  };

  if (focusedTask) {
    return (
      <FocusedTask task={focusedTask} onCompleteTask={handleCompleteTask} />
    );
  }

  if (hasCompletedTasks) {
    return <AllTasksCompleted />;
  }
};

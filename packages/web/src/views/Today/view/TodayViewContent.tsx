import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { CalendarAgenda } from "../components/CalendarAgenda/CalendarAgenda";
import { ShortcutsOverlay } from "../components/Shortcuts/components/ShortcutsOverlay";
import { TaskList } from "../components/TaskList/TaskList";
import { useDateNavigation } from "../hooks/navigation/useDateNavigation";
import { useTodayViewShortcuts } from "../hooks/shortcuts/useTodayViewShortcuts";
import { useTasks } from "../hooks/tasks/useTasks";
import { focusOnAddTaskInput, focusOnFirstTask } from "../util/shortcut.util";

export const TodayViewContent = () => {
  const {
    tasks,
    selectedTaskIndex,
    focusOnInput,
    setSelectedTaskIndex,
    setEditingTaskId,
    setEditingTitle,
    deleteTask,
    restoreTask,
    undoToastId,
  } = useTasks();

  const navigate = useNavigate();

  const { navigateToNextDay, navigateToPreviousDay, navigateToToday } =
    useDateNavigation();

  const hasFocusedTask =
    selectedTaskIndex >= 0 && selectedTaskIndex < tasks.length;

  const getTaskIndexToEdit = () => {
    if (hasFocusedTask) {
      return selectedTaskIndex;
    } else if (tasks.length > 0) {
      return 0;
    }
    return -1;
  };

  const handleEditTask = () => {
    const taskIndexToEdit = getTaskIndexToEdit();
    if (taskIndexToEdit >= 0) {
      const taskId = tasks[taskIndexToEdit].id;
      setEditingTaskId(taskId);
      setEditingTitle(tasks[taskIndexToEdit].title);
      setSelectedTaskIndex(taskIndexToEdit);
      focusOnInput(taskId);
    }
  };

  const handleDeleteTask = () => {
    // Get the task ID directly from the active element
    const activeElement = document.activeElement as HTMLElement | null;
    const taskId = activeElement?.dataset?.taskId;

    if (taskId) {
      deleteTask(taskId);
    }
  };

  const handleNavigateNow = () => {
    navigate(ROOT_ROUTES.NOW);
  };

  const handleNavigateDay = () => {
    navigate(ROOT_ROUTES.DAY);
  };

  const handleNavigateWeek = () => {
    navigate(ROOT_ROUTES.ROOT);
  };

  useTodayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onRestoreTask: restoreTask,
    onFocusTasks: focusOnFirstTask,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: navigateToToday,
    onNavigateNow: handleNavigateNow,
    onNavigateDay: handleNavigateDay,
    onNavigateWeek: handleNavigateWeek,
    hasFocusedTask,
    undoToastId,
  });

  return (
    <div className="flex h-screen w-full items-center justify-center gap-8 overflow-hidden px-6 py-8">
      <ShortcutsOverlay />
      <TaskList />

      <CalendarAgenda />
    </div>
  );
};

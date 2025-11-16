import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { getShortcuts } from "../../../common/utils/shortcut/data/shortcuts.data";
import { Agenda } from "../components/Agenda/Agenda";
import { StorageInfoModal } from "../components/StorageInfoModal/StorageInfoModal";
import { TaskList } from "../components/TaskList/TaskList";
import { useStorageInfoModal } from "../context/StorageInfoModalContext";
import { useDayEvents } from "../hooks/events/useDayEvents";
import { useDateInView } from "../hooks/navigation/useDateInView";
import { useDateNavigation } from "../hooks/navigation/useDateNavigation";
import { useDayViewShortcuts } from "../hooks/shortcuts/useDayViewShortcuts";
import { useTasks } from "../hooks/tasks/useTasks";
import { focusFirstAgendaEvent } from "../util/agenda/focus.util";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "../util/day.shortcut.util";

export const DayViewContent = () => {
  const {
    tasks,
    selectedTaskIndex,
    focusOnInput,
    setSelectedTaskIndex,
    setEditingTaskId,
    setEditingTitle,
    deleteTask,
    restoreTask,
    migrateTask,
    undoToastId,
  } = useTasks();
  const { isOpen: isModalOpen, closeModal } = useStorageInfoModal();

  const navigate = useNavigate();
  const dateInView = useDateInView();
  const shortcuts = getShortcuts({ currentDate: dateInView });
  const events = useAppSelector(selectDayEvents);
  const scrollToNowLineRef = useRef<() => void>();
  useDayEvents(dateInView);

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

  const handleFocusAgenda = () => {
    focusFirstAgendaEvent(events);
  };

  const handleScrollToNowLineReady = useCallback(
    (scrollToNowLine: () => void) => {
      scrollToNowLineRef.current = scrollToNowLine;
    },
    [],
  );

  const handleGoToToday = () => {
    // Compare dates in the same timezone (UTC) to avoid timezone issues
    const todayUTC = dayjs().startOf("day").utc();
    const isViewingToday = dateInView.isSame(todayUTC, "day");

    if (isViewingToday && scrollToNowLineRef.current) {
      scrollToNowLineRef.current();
    } else {
      navigateToToday();
    }
  };

  useDayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onRestoreTask: restoreTask,
    onMigrateTask: migrateTask,
    onFocusTasks: focusOnFirstTask,
    onFocusAgenda: handleFocusAgenda,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
    onNavigateNow: handleNavigateNow,
    onNavigateDay: handleNavigateDay,
    onNavigateWeek: handleNavigateWeek,
    hasFocusedTask,
    undoToastId,
  });

  return (
    <>
      <div className="flex h-screen w-full items-center justify-center gap-8 overflow-hidden px-6 py-8">
        <ShortcutsOverlay
          sections={[
            { title: "Home", shortcuts: shortcuts.homeShortcuts },
            { title: "Tasks", shortcuts: shortcuts.dayTaskShortcuts },
            { title: "Calendar", shortcuts: shortcuts.dayAgendaShortcuts },
            { title: "Global", shortcuts: shortcuts.globalShortcuts },
          ]}
        />
        <TaskList />

        <Agenda onScrollToNowLineReady={handleScrollToNowLineReady} />
      </div>
      <StorageInfoModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

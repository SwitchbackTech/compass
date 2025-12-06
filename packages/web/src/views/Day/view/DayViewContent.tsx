import { useCallback, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { MousePositionProvider } from "@web/common/context/mouse-position";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Dedication } from "@web/views/Calendar/components/Dedication";
import { DraftProviderV2 } from "@web/views/Calendar/components/Draft/context/DraftProviderV2";
import { useRefetch } from "@web/views/Calendar/hooks/useRefetch";
import { StyledCalendar } from "@web/views/Calendar/styled";
import { Agenda } from "@web/views/Day/components/Agenda/Agenda";
import { DayCmdPalette } from "@web/views/Day/components/DayCmdPalette";
import { Header } from "@web/views/Day/components/Header/Header";
import { StorageInfoModal } from "@web/views/Day/components/StorageInfoModal/StorageInfoModal";
import { TaskList } from "@web/views/Day/components/TaskList/TaskList";
import { useStorageInfoModal } from "@web/views/Day/context/StorageInfoModalContext";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import { focusFirstAgendaEvent } from "@web/views/Day/util/agenda/focus.util";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "@web/views/Day/util/day.shortcut.util";

export const DayViewContent = () => {
  useRefetch();

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
    // Compare dates in the same timezone to avoid timezone issues
    // Get today's date in local timezone, preserve calendar date when converting to UTC
    const today = dayjs().startOf("day");
    const isViewingToday = dateInView.isSame(today, "day");

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
    hasFocusedTask,
    undoToastId,
  });

  return (
    <MousePositionProvider>
      <DraftProviderV2>
        <DayCmdPalette onGoToToday={handleGoToToday} />
        <Dedication />

        <StyledCalendar>
          <Header />

          <div
            className={`flex max-w-4/7 min-w-4/7 flex-1 justify-center gap-8 self-center overflow-hidden`}
          >
            <TaskList />

            <Agenda onScrollToNowLineReady={handleScrollToNowLineReady} />
          </div>
        </StyledCalendar>

        <StorageInfoModal isOpen={isModalOpen} onClose={closeModal} />

        <ShortcutsOverlay
          sections={[
            { title: "Home", shortcuts: shortcuts.homeShortcuts },
            { title: "Tasks", shortcuts: shortcuts.dayTaskShortcuts },
            { title: "Calendar", shortcuts: shortcuts.dayAgendaShortcuts },
            { title: "Global", shortcuts: shortcuts.globalShortcuts },
          ]}
        />

        <FloatingEventForm />
      </DraftProviderV2>
    </MousePositionProvider>
  );
};

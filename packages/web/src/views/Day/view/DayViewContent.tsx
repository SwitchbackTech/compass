import { useCallback, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { MousePositionProvider } from "@web/common/context/mouse-position";
import { useEventDNDActions } from "@web/common/hooks/useEventDNDActions";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Dedication } from "@web/views/Calendar/components/Dedication";
import { DraftProviderV2 } from "@web/views/Calendar/components/Draft/context/DraftProviderV2";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
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
import {
  focusFirstAgendaEvent,
  getFirstAgendaEventId,
  getFocusedAgendaEventId,
} from "@web/views/Day/util/agenda/focus.util";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "@web/views/Day/util/day.shortcut.util";

const DayViewContentInner = () => {
  useRefetch();
  useEventDNDActions();

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
    // Both dates are in local timezone, ensuring accurate day comparison
    const today = dayjs().startOf("day");
    const isViewingToday = dateInView.isSame(today, "day");

    if (isViewingToday && scrollToNowLineRef.current) {
      scrollToNowLineRef.current();
    } else {
      navigateToToday();
    }
  };

  const { openEventForm } = useDraftContextV2();

  const onCreateEvent = useCallback(() => {
    openEventForm(true);
  }, [openEventForm]);

  const handleEditEvent = useCallback(() => {
    // First check if an event is currently focused
    const focusedEventId = getFocusedAgendaEventId();
    if (focusedEventId) {
      // Open the form for the focused event
      openEventForm(false);
      return;
    }

    // If no event is focused, get the first event
    const firstEventId = getFirstAgendaEventId(events);
    if (firstEventId) {
      // Focus the event first
      const element = document.querySelector(
        `[data-event-id="${firstEventId}"]`,
      ) as HTMLElement;
      if (element) {
        element.focus();
        // Then open the form
        openEventForm(false);
      }
    }
    // If there are no events, do nothing
  }, [openEventForm, events]);

  useDayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onRestoreTask: restoreTask,
    onMigrateTask: migrateTask,
    onFocusTasks: focusOnFirstTask,
    onFocusAgenda: handleFocusAgenda,
    onCreateEvent: onCreateEvent,
    onEditEvent: handleEditEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
    hasFocusedTask,
    undoToastId,
  });

  return (
    <>
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
          { title: "Day", shortcuts: shortcuts.dayShortcuts },
          { title: "Tasks", shortcuts: shortcuts.dayTaskShortcuts },
          { title: "Calendar", shortcuts: shortcuts.dayAgendaShortcuts },
          { title: "Global", shortcuts: shortcuts.globalShortcuts },
        ]}
      />

      <FloatingEventForm />
    </>
  );
};

export const DayViewContent = () => {
  return (
    <MousePositionProvider>
      <DraftProviderV2>
        <DayViewContentInner />
      </DraftProviderV2>
    </MousePositionProvider>
  );
};

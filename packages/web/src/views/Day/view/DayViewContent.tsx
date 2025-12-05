import { useCallback, useRef } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import { MousePositionProvider } from "@web/common/context/mouse-position";
import { useMousePosition } from "@web/common/hooks/useMousePosition";
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
import { focusFirstAgendaEvent } from "@web/views/Day/util/agenda/focus.util";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "@web/views/Day/util/day.shortcut.util";

const DayViewContentInner = () => {
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
    // Compare dates in the same timezone (UTC) to avoid timezone issues
    const todayUTC = dayjs().startOf("day").utc();
    const isViewingToday = dateInView.isSame(todayUTC, "day");

    if (isViewingToday && scrollToNowLineRef.current) {
      scrollToNowLineRef.current();
    } else {
      navigateToToday();
    }
  };

  const { setDraft } = useDraftContextV2();
  const mousePosition = useMousePosition();
  const { setOpenAtMousePosition, floating } = mousePosition;

  const handleCreateEvent = useCallback(async () => {
    try {
      const user = await getUserId();
      if (!user) return;

      // Create a new event starting at the current hour
      const now = dayjs();
      const startTime = dateInView
        .hour(now.hour())
        .minute(0)
        .second(0)
        .millisecond(0);
      const endTime = startTime.add(1, "hour");

      const draftEvent = {
        title: "",
        description: "",
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        isAllDay: false,
        isSomeday: false,
        user,
        priority: Priorities.UNASSIGNED,
        origin: Origin.COMPASS,
      };

      // Get the center of the screen for positioning the form
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Create a virtual reference point at the center of the screen
      const virtualRef = {
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          x: centerX,
          y: centerY,
          top: centerY,
          left: centerX,
          right: centerX,
          bottom: centerY,
          toJSON: () => ({}),
        }),
      };

      // Set the reference for the floating UI if available
      if (floating?.refs?.setReference) {
        floating.refs.setReference(virtualRef);
      }

      // Set the draft and open the form at the mouse position
      setDraft(draftEvent);
      setOpenAtMousePosition(true);
    } catch (error) {
      // Silently fail if user authentication fails
      // The user will already be redirected to login if not authenticated
      console.error("Failed to create event:", error);
    }
  }, [dateInView, setDraft, setOpenAtMousePosition, floating]);

  useDayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onRestoreTask: restoreTask,
    onMigrateTask: migrateTask,
    onFocusTasks: focusOnFirstTask,
    onFocusAgenda: handleFocusAgenda,
    onCreateEvent: handleCreateEvent,
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
          { title: "Home", shortcuts: shortcuts.homeShortcuts },
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

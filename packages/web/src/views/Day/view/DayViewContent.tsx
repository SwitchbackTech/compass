import { memo, useCallback, useMemo } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { DayCalendarGrid } from "@web/views/Day/components/Calendar/DayCalendarGrid";
import { DayCmdPalette } from "@web/views/Day/components/DayCmdPalette";
import { Header } from "@web/views/Day/components/Header/Header";
import { TaskList } from "@web/views/Day/components/TaskList/TaskList";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import {
  focusFirstDayCalendarEvent,
  openEventFormEditEvent,
} from "@web/views/Day/interaction/dayCalendarFocus.util";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "@web/views/Day/util/day.shortcut.util";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";
import { useRefetch } from "@web/views/Week/hooks/useRefetch";
import { Styled, StyledCalendar } from "@web/views/Week/styled";

export const DayViewContent = memo(() => {
  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

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
  const dateInView = useDateInView();
  const shortcuts = getShortcuts({
    currentDate: dateInView,
  });

  const {
    navigateToDate,
    navigateToNextDay,
    navigateToPreviousDay,
    navigateToToday,
  } = useDateNavigation();
  useDayEvents(dateInView);

  const plannerViewStart = dateInView.startOf("week");
  const plannerViewEnd = dateInView.endOf("week");

  const toggleSidebar = useCallback(() => {
    dispatch(viewSlice.actions.toggleSidebar());
  }, [dispatch]);
  const { closeShortcuts, isShortcutsOpen, toggleShortcuts } =
    usePlannerShortcuts({
      isSidebarOpen,
      onToggleSidebar: toggleSidebar,
    });

  const shortcutSections = useMemo(
    () => [
      { title: "Day", shortcuts: shortcuts.dayShortcuts },
      { title: "Tasks", shortcuts: shortcuts.dayTaskShortcuts },
      { title: "Calendar", shortcuts: shortcuts.dayAgendaShortcuts },
      { title: "Global", shortcuts: shortcuts.globalShortcuts },
    ],
    [
      shortcuts.dayAgendaShortcuts,
      shortcuts.dayShortcuts,
      shortcuts.dayTaskShortcuts,
      shortcuts.globalShortcuts,
    ],
  );

  const hasFocusedTask =
    selectedTaskIndex >= 0 && selectedTaskIndex < tasks.length;

  const getTaskIndexToEdit = useCallback(() => {
    if (hasFocusedTask) {
      return selectedTaskIndex;
    } else if (tasks.length > 0) {
      return 0;
    }
    return -1;
  }, [hasFocusedTask, selectedTaskIndex, tasks.length]);

  const handleEditTask = useCallback(() => {
    const taskIndexToEdit = getTaskIndexToEdit();
    if (taskIndexToEdit >= 0) {
      const taskId = tasks[taskIndexToEdit]._id;
      setEditingTaskId(taskId);
      setEditingTitle(tasks[taskIndexToEdit].title);
      setSelectedTaskIndex(taskIndexToEdit);
      focusOnInput(taskId);
    }
  }, [
    tasks,
    getTaskIndexToEdit,
    setEditingTaskId,
    setEditingTitle,
    setSelectedTaskIndex,
    focusOnInput,
  ]);

  const handleDeleteTask = useCallback(() => {
    // Get the task ID directly from the active element
    const activeElement = document.activeElement as HTMLElement | null;
    const taskId = activeElement?.dataset?.taskId;

    if (taskId) {
      deleteTask(taskId);
    }
  }, [deleteTask]);

  const handleGoToToday = useCallback(() => {
    // Compare dates in the same timezone to avoid timezone issues
    // Both dates are in local timezone, ensuring accurate day comparison
    const today = dayjs().startOf("day");
    const isViewingToday = dateInView.isSame(today, "day");

    if (isViewingToday) {
      compassEventEmitter.emit(CompassDOMEvents.SCROLL_TO_NOW_LINE);
    } else {
      navigateToToday();
    }
  }, [dateInView, navigateToToday]);

  useDayViewShortcuts({
    onAddTask: focusOnAddTaskInput,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onRestoreTask: restoreTask,
    onMigrateTask: migrateTask,
    onFocusTasks: focusOnFirstTask,
    onFocusCalendar: focusFirstDayCalendarEvent,
    onEditEvent: openEventFormEditEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
    onToggleSidebar: toggleSidebar,
    hasFocusedTask,
    undoToastId,
  });

  return (
    <Styled id="day">
      <DayCmdPalette onGoToToday={handleGoToToday} />
      <Dedication />

      {isSidebarOpen ? (
        <PlannerSidebar
          calendarDate={dateInView}
          isShortcutsOpen={isShortcutsOpen}
          onCloseShortcuts={closeShortcuts}
          onToggleShortcuts={toggleShortcuts}
          onSelectDate={navigateToDate}
          onToggleSidebar={toggleSidebar}
          shortcutSections={shortcutSections}
          showSomedayEventSections={false}
          viewEnd={plannerViewEnd}
          viewStart={plannerViewStart}
        />
      ) : null}

      <StyledCalendar>
        <Header
          showReminder={false}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        <div className="flex w-full flex-1 gap-8 overflow-hidden">
          <TaskList />

          <DayCalendarGrid />
        </div>
      </StyledCalendar>
    </Styled>
  );
});

DayViewContent.displayName = "DayViewContent";

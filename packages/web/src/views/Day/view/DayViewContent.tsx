import classNames from "classnames";
import { memo, useCallback, useMemo } from "react";
import dayjs from "@core/util/date/dayjs";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { getShortcuts } from "@web/common/shortcuts/data/shortcuts.data";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { DayCalendarGrid } from "@web/views/Day/components/Calendar/DayCalendarGrid";
import { DayCmdPalette } from "@web/views/Day/components/DayCmdPalette";
import { Header } from "@web/views/Day/components/Header/Header";
import { TaskList } from "@web/views/Day/components/TaskList/TaskList";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useResizableTaskList } from "@web/views/Day/hooks/layout/useResizableTaskList";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import {
  focusFirstDayCalendarEvent,
  openEventFormEditEvent,
} from "@web/views/Day/interaction/dayCalendarFocus.util";
import {
  TASK_LIST_MAX_WIDTH,
  TASK_LIST_MIN_WIDTH,
} from "@web/views/Day/storage/task-list-width.constants";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "@web/views/Day/util/day.shortcut.util";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";

export const DayViewContent = memo(() => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const {
    width: taskListWidth,
    isResizing,
    dividerProps,
  } = useResizableTaskList();

  const {
    tasks,
    selectedTaskIndex,
    focusOnInput,
    setSelectedTaskIndex,
    setEditingTaskId,
    setEditingTitle,
    deleteTask,
    migrateTask,
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
    viewActions.toggleSidebar();
  }, []);
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
    onMigrateTask: migrateTask,
    onFocusTasks: focusOnFirstTask,
    onFocusCalendar: focusFirstDayCalendarEvent,
    onEditEvent: openEventFormEditEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
    onToggleSidebar: toggleSidebar,
    hasFocusedTask,
  });

  return (
    <div id="day" className="flex h-screen w-screen overflow-hidden">
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

      <div
        id={ID_MAIN}
        className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-5 pl-8"
      >
        <Header />

        <div
          className={classNames("flex w-full flex-1 overflow-hidden", {
            "cursor-col-resize select-none": isResizing,
          })}
        >
          <TaskList width={taskListWidth} />

          {/* biome-ignore lint/a11y/useSemanticElements: An hr cannot host the focusable, draggable window-splitter interaction. */}
          <div
            {...dividerProps}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize task list"
            aria-valuemin={TASK_LIST_MIN_WIDTH}
            aria-valuemax={TASK_LIST_MAX_WIDTH}
            aria-valuenow={taskListWidth}
            tabIndex={0}
            className="group relative w-8 shrink-0 cursor-col-resize touch-none focus:outline-none"
          >
            <div
              className={classNames(
                "absolute inset-y-1 left-0 w-px rounded-full bg-grid-line-primary transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none",
                "group-hover:w-0.5 group-hover:bg-text-lighter/60",
                "group-focus-visible:w-0.5 group-focus-visible:bg-text-lighter/60",
                { "w-0.5 bg-text-lighter/60": isResizing },
              )}
            />
          </div>

          <DayCalendarGrid />
        </div>
      </div>
    </div>
  );
});

DayViewContent.displayName = "DayViewContent";

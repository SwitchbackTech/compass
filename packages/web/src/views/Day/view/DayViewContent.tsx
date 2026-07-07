import classNames from "classnames";
import { memo, useCallback, useMemo } from "react";
import dayjs from "@core/util/date/dayjs";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { useCollapsiblePanel } from "@web/common/hooks/useCollapsiblePanel";
import { getShortcutMenuSections } from "@web/common/shortcuts/data/shortcuts.data";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { CollapsiblePanel } from "@web/components/CollapsiblePanel/CollapsiblePanel";
import { CommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import {
  selectIsSidebarOpen,
  selectIsTaskListOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { DayCalendarGrid } from "@web/views/Day/components/Calendar/DayCalendarGrid";
import { Header } from "@web/views/Day/components/Header/Header";
import { TaskList } from "@web/views/Day/components/TaskList/TaskList";
import { getDayCmdTasks } from "@web/views/Day/getDayCmdTasks";
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
  TASK_LIST_DIVIDER_WIDTH,
  TASK_LIST_MAX_WIDTH,
  TASK_LIST_MIN_WIDTH,
} from "@web/views/Day/storage/task-list-width.constants";
import {
  focusOnAddTaskInput,
  focusOnFirstTask,
} from "@web/views/Day/util/day.shortcut.util";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Week/layout.constants";

export const DayViewContent = memo(() => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const isTaskListOpen = useViewStore(selectIsTaskListOpen);
  // The task list and its resize divider animate as one unit, so they share
  // a single transition instance instead of using CollapsiblePanel.
  const taskListTransition = useCollapsiblePanel(isTaskListOpen);
  const {
    width: taskListWidth,
    isResizing,
    dividerProps,
  } = useResizableTaskList();
  // Only animate open/close: a live divider drag must track the pointer
  // 1:1, not lag behind an in-flight width transition.
  const animatesWidth = !isResizing;

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
  const isViewingToday = dateInView.isSame(dayjs(), "day");

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
  const toggleTaskList = useCallback(() => {
    viewActions.toggleTaskList();
  }, []);
  // Task-focused shortcuts imply the user wants the list visible; reopen it
  // first and defer focus a frame so the list exists in the DOM.
  const withTaskListOpen = useCallback((focusTask: () => void) => {
    return () => {
      if (selectIsTaskListOpen(useViewStore.getState())) {
        focusTask();
        return;
      }
      viewActions.setTaskListOpen(true);
      requestAnimationFrame(focusTask);
    };
  }, []);
  const { closeShortcuts, isShortcutsOpen, toggleShortcuts } =
    usePlannerShortcuts({
      isSidebarOpen,
      onToggleSidebar: toggleSidebar,
    });

  const shortcutSections = useMemo(
    () =>
      getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: isViewingToday,
      }),
    [isViewingToday],
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

  const handleCreateAllDayEvent = useCallback(() => {
    compassEventEmitter.emit(CompassDOMEvents.CREATE_ALLDAY_DRAFT);
  }, []);

  useDayViewShortcuts({
    onCreateAllDayEvent: handleCreateAllDayEvent,
    onAddTask: withTaskListOpen(focusOnAddTaskInput),
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onMigrateTask: migrateTask,
    onFocusTasks: withTaskListOpen(focusOnFirstTask),
    onFocusCalendar: focusFirstDayCalendarEvent,
    onEditEvent: openEventFormEditEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
    hasFocusedTask,
  });

  return (
    <div id="day" className="flex h-screen w-screen overflow-hidden">
      <CommandPalette
        currentView="day"
        today={dayjs()}
        onGoToToday={handleGoToToday}
        commonTasks={getDayCmdTasks()}
        placeholder="Try: 'week', 'today', 'bug', or 'code'"
      />
      <Dedication />

      <CollapsiblePanel isOpen={isSidebarOpen} width={SIDEBAR_OPEN_WIDTH}>
        <PlannerSidebar
          calendarDate={dateInView}
          isShortcutsOpen={isShortcutsOpen}
          onCloseShortcuts={closeShortcuts}
          onToggleShortcuts={toggleShortcuts}
          onSelectDate={navigateToDate}
          onToggleSidebar={toggleSidebar}
          shortcutSections={shortcutSections}
          shortcutsViewLabel="Day"
          showSomedayEventSections={false}
          viewEnd={plannerViewEnd}
          viewStart={plannerViewStart}
        />
      </CollapsiblePanel>

      <div
        id={ID_MAIN}
        className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-5 pl-8 transition-[width] duration-200 ease-out motion-reduce:transition-none"
      >
        <Header />

        <div
          className={classNames("flex w-full flex-1 overflow-hidden", {
            "cursor-col-resize select-none": isResizing,
          })}
        >
          {taskListTransition.isMounted ? (
            <>
              <div
                className={classNames(
                  "h-full min-w-0 shrink-0 overflow-hidden",
                  {
                    "transition-[width] duration-200 ease-out motion-reduce:transition-none":
                      animatesWidth,
                  },
                )}
                onTransitionEnd={taskListTransition.onTransitionEnd}
                style={{
                  width: taskListTransition.isExpanded ? taskListWidth : 0,
                }}
              >
                <TaskList width={taskListWidth} />
              </div>

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
                className={classNames(
                  "group relative min-w-0 shrink-0 cursor-col-resize touch-none overflow-hidden focus:outline-none",
                  {
                    "transition-[width] duration-200 ease-out motion-reduce:transition-none":
                      animatesWidth,
                  },
                )}
                style={{
                  width: taskListTransition.isExpanded
                    ? TASK_LIST_DIVIDER_WIDTH
                    : 0,
                }}
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
            </>
          ) : null}

          <DayCalendarGrid />
        </div>
      </div>
    </div>
  );
});

DayViewContent.displayName = "DayViewContent";

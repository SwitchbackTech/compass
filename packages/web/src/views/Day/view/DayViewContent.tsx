import { memo, useCallback } from "react";
import dayjs from "@core/util/date/dayjs";
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { useEventDNDActions } from "@web/common/hooks/useEventDNDActions";
import { useGridOrganization } from "@web/common/hooks/useGridOrganization";
import { useMainGridSelection } from "@web/common/hooks/useMainGridSelection";
import { useMainGridSelectionActions } from "@web/common/hooks/useMainGridSelectionActions";
import { useSidebarState } from "@web/common/hooks/useSidebarState";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { openEventFormEditEvent } from "@web/common/utils/event/event.util";
import { getShortcuts } from "@web/hotkeys/registry/shortcuts.data";
import { Dedication } from "@web/views/Calendar/components/Dedication/Dedication";
import { useRefetch } from "@web/views/Calendar/hooks/useRefetch";
import { StyledCalendar } from "@web/views/Calendar/styled";
import { Agenda } from "@web/views/Day/components/Agenda/Agenda";
import { DayCmdPalette } from "@web/views/Day/components/DayCmdPalette";
import { Header } from "@web/views/Day/components/Header/Header";
import { ShortcutsSidebar } from "@web/views/Day/components/ShortcutsSidebar/ShortcutsSidebar";
import { TaskList } from "@web/views/Day/components/TaskList/TaskList";
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

export const DayViewContent = memo(() => {
  const { isSidebarOpen, toggleSidebar } = useSidebarState();

  const selectionActions = useMainGridSelectionActions();
  const { timedEventsGridRef } = useCompassRefs();
  const grid = timedEventsGridRef.current;

  useRefetch();
  useEventDNDActions();
  useMainGridSelection(selectionActions);
  useGridOrganization(grid);

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
  const shortcuts = getShortcuts({ currentDate: dateInView });

  const { navigateToNextDay, navigateToPreviousDay, navigateToToday } =
    useDateNavigation();
  useDayEvents(dateInView);

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
    onFocusAgenda: focusFirstAgendaEvent,
    onEditEvent: openEventFormEditEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
    onToggleSidebar: toggleSidebar,
    hasFocusedTask,
    undoToastId,
  });

  return (
    <>
      <DayCmdPalette onGoToToday={handleGoToToday} />
      <Dedication />

      <StyledCalendar>
        <Header
          showReminder={false}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        <div className="flex w-full flex-1 justify-center gap-8 overflow-hidden xl:max-w-4/7 xl:self-center">
          <TaskList />

          <Agenda />
        </div>
      </StyledCalendar>

      <ShortcutsSidebar
        isOpen={isSidebarOpen}
        sections={[
          { title: "Day", shortcuts: shortcuts.dayShortcuts },
          { title: "Tasks", shortcuts: shortcuts.dayTaskShortcuts },
          { title: "Calendar", shortcuts: shortcuts.dayAgendaShortcuts },
          { title: "Global", shortcuts: shortcuts.globalShortcuts },
        ]}
      />
    </>
  );
});

DayViewContent.displayName = "DayViewContent";

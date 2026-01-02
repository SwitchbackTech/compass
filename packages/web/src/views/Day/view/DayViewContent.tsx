import { memo, useCallback } from "react";
import dayjs from "@core/util/date/dayjs";
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { useEventDNDActions } from "@web/common/hooks/useEventDNDActions";
import { useGridOrganization } from "@web/common/hooks/useGridOrganization";
import { useMainGridSelection } from "@web/common/hooks/useMainGridSelection";
import { useMainGridSelectionActions } from "@web/common/hooks/useMainGridSelectionActions";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import {
  openEventFormCreateEvent,
  openEventFormEditEvent,
} from "@web/common/utils/event/event.util";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { ShortcutsOverlay } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { Dedication } from "@web/views/Calendar/components/Dedication";
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

export const DayViewContent = memo(() => {
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
  const { isOpen: isModalOpen, closeModal } = useStorageInfoModal();
  const dateInView = useDateInView();
  const shortcuts = getShortcuts({ currentDate: dateInView });

  useDayEvents(dateInView);

  const { navigateToNextDay, navigateToPreviousDay, navigateToToday } =
    useDateNavigation();

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
      const taskId = tasks[taskIndexToEdit].id;
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
    onCreateEvent: openEventFormCreateEvent,
    onEditEvent: openEventFormEditEvent,
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
        <Header showReminder={false} />

        <div
          className={`flex max-w-4/7 min-w-4/7 flex-1 justify-center gap-8 self-center overflow-hidden`}
        >
          <TaskList />

          <Agenda />
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
    </>
  );
});

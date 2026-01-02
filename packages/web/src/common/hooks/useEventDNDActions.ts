import { useCallback } from "react";
import { Active, DragEndEvent, Over, useDndMonitor } from "@dnd-kit/core";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  CursorItem,
  isOpenAtCursor,
  setFloatingReferenceAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { Task } from "@web/common/types/task.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { reorderGrid } from "@web/common/utils/dom/grid-organization.util";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
import { store } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { handleTaskToEventConversion } from "@web/views/Day/util/task/handleTaskToEventConversion";

const shouldSaveImmediately = (_id: string) => {
  const storeEvent = selectEventById(store.getState(), _id);

  return !!storeEvent && !isOpenAtCursor(CursorItem.EventForm);
};

const setReference = (_id: string) => {
  // Run inside a microtask to ensure the DOM has updated after drag end
  queueMicrotask(() => {
    const reference = getCalendarEventElementFromGrid(_id);

    if (reference) setFloatingReferenceAtCursor(reference);
  });
};

export function useEventDNDActions() {
  const updateEvent = useUpdateEvent();
  const dispatch = useAppDispatch();
  const dateInView = useDateInView();

  const convertTaskToEventOnAgenda = useCallback(
    async (
      task: Task,
      active: Active,
      over: Over,
      deleteTask: () => void,
      isAllDay: boolean = false,
    ) => {
      const userId = await getUserId();
      if (!userId) return;

      const event = handleTaskToEventConversion(
        task,
        active,
        over,
        dateInView,
        userId,
        isAllDay,
      );

      if (!event) return;

      // Add event to pending events and create optimistically
      dispatch(pendingEventsSlice.actions.add(event._id!));
      dispatch(createEventSlice.actions.request(event));

      // Note: Task deletion happens immediately for simplicity. The event saga
      // will remove the optimistic event if creation fails, but the task cannot
      // be restored because tasks are not in Redux (only local state + localStorage).
      // Proper error handling would require: (1) moving tasks to Redux, (2) storing
      // task-to-event mappings, and (3) dispatching deleteTask actions from the saga.
      deleteTask();

      reorderGrid();
      setReference(event._id!);
    },
    [dispatch, dateInView],
  );

  const moveTimedAroundMainGridDayView = useCallback(
    (event: Schema_GridEvent, active: Active, over: Over) => {
      const snappedMinutes = getSnappedMinutes(active, over);

      if (snappedMinutes === null || !event._id) return;

      const start = dayjs(event.startDate);
      const end = dayjs(event.endDate);
      const durationMinutes = end.diff(start, "minute");
      const newStartDate = start.startOf("day").add(snappedMinutes, "minute");
      const newEndDate = newStartDate.add(durationMinutes, "minute");

      const startChanged = !newStartDate.isSame(start);
      const endChanged = !newEndDate.isSame(end);

      if (!startChanged && !endChanged) return;

      updateEvent(
        {
          event: {
            ...event,
            startDate: newStartDate.toISOString(),
            endDate: newEndDate.toISOString(),
          },
        },
        shouldSaveImmediately(event._id),
      );

      reorderGrid();
    },
    [updateEvent],
  );

  const moveAllDayToMainGridDayView = useCallback(
    (event: Schema_GridEvent, active: Active, over: Over) => {
      const snappedMinutes = getSnappedMinutes(active, over);

      if (snappedMinutes === null || !event._id) return;

      const start = dayjs(event.startDate).startOf("day");
      const startDate = start.add(snappedMinutes, "minute");
      const endDate = startDate.add(15, "minutes"); // Default 15 mins

      updateEvent(
        {
          event: {
            ...event,
            isAllDay: false,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
        shouldSaveImmediately(event._id),
      );

      reorderGrid();
      setReference(event._id);
    },
    [updateEvent],
  );

  const moveTimedToAllDayGridDayView = useCallback(
    (event: Schema_GridEvent) => {
      if (!event._id) return;
      const startDate = dayjs(event.startDate).startOf("day");
      const endDate = dayjs(event.endDate).startOf("day").add(1, "day");

      updateEvent(
        {
          event: {
            ...event,
            isAllDay: true,
            startDate: startDate.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
            endDate: endDate.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
          },
        },
        shouldSaveImmediately(event._id),
      );

      reorderGrid();
      setReference(event._id);
    },
    [updateEvent],
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      const { data } = active;
      const { view, type, event, task, deleteTask } = data.current ?? {};

      if (!over?.id) return;

      const switchCase = `${view}-${type}-to-${over.id}`;

      switch (switchCase) {
        case `day-task-to-${ID_GRID_MAIN}`:
          if (!task || !deleteTask) break;
          convertTaskToEventOnAgenda(task, active, over, deleteTask, false);
          break;
        case `day-task-to-${ID_GRID_ALLDAY_ROW}`:
          if (!task || !deleteTask) break;
          convertTaskToEventOnAgenda(task, active, over, deleteTask, true);
          break;
        case `day-${Categories_Event.ALLDAY}-to-${ID_GRID_MAIN}`:
          if (!event) break;
          moveAllDayToMainGridDayView(event, active, over);
          break;
        case `day-${Categories_Event.TIMED}-to-${ID_GRID_MAIN}`:
          if (!event) break;
          moveTimedAroundMainGridDayView(event, active, over);
          break;
        case `day-${Categories_Event.TIMED}-to-${ID_GRID_ALLDAY_ROW}`:
          if (!event) break;
          moveTimedToAllDayGridDayView(event);
          break;
      }
    },
    [
      convertTaskToEventOnAgenda,
      moveAllDayToMainGridDayView,
      moveTimedAroundMainGridDayView,
      moveTimedToAllDayGridDayView,
    ],
  );

  useDndMonitor({ onDragEnd });
}

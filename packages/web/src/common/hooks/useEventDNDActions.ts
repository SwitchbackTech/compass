import { useCallback } from "react";
import { Active, DragEndEvent, Over, useDndMonitor } from "@dnd-kit/core";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
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
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { reorderGrid } from "@web/common/utils/dom/grid-organization.util";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { getSnappedMinutes } from "@web/views/Day/util/agenda/agenda.util";

const shouldSaveImmediately = () => !isOpenAtCursor(CursorItem.EventForm);

const resetFloatingReference = (eventId: string) => {
  queueMicrotask(() => {
    const reference = getCalendarEventElementFromGrid(eventId);

    setFloatingReferenceAtCursor(reference);
    reorderGrid();
  });
};

export function useEventDNDActions() {
  const updateEvent = useUpdateEvent();

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
        shouldSaveImmediately(),
      );

      resetFloatingReference(event._id);
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
        shouldSaveImmediately(),
      );

      resetFloatingReference(event._id);
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
        shouldSaveImmediately(),
      );

      resetFloatingReference(event._id);
    },
    [updateEvent],
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      const { data } = active;
      const { view, type, event } = data.current ?? {};

      if (!over?.id || !event) return;

      const switchCase = `${view}-${type}-to-${over.id}`;

      switch (switchCase) {
        case `day-${Categories_Event.ALLDAY}-to-${ID_GRID_MAIN}`:
          return moveAllDayToMainGridDayView(event, active, over);
        case `day-${Categories_Event.TIMED}-to-${ID_GRID_MAIN}`:
          return moveTimedAroundMainGridDayView(event, active, over);
        case `day-${Categories_Event.TIMED}-to-${ID_GRID_ALLDAY_ROW}`:
          return moveTimedToAllDayGridDayView(event);
        default:
          return;
      }
    },
    [
      moveAllDayToMainGridDayView,
      moveTimedAroundMainGridDayView,
      moveTimedToAllDayGridDayView,
    ],
  );

  useDndMonitor({ onDragEnd });
}

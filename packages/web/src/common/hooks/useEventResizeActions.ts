import { ResizeCallback, ResizeStartCallback } from "re-resizable";
import { useCallback, useRef } from "react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CursorItem, nodeId$, open$ } from "@web/common/hooks/useOpenAtCursor";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { reorderGrid } from "@web/common/utils/dom/grid-organization.util";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { store } from "@web/store";
import { setDraft, updateDraft } from "@web/store/events";
import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";
import {
  roundMinutesToNearestFifteen,
  roundToNearestFifteenWithinHour,
} from "@web/views/Day/util/agenda/agenda.util";

export function useEventResizeActions(event: WithCompassId<Schema_Event>) {
  const updateReduxEvent = useUpdateEvent();
  const originalEvent = useRef<WithCompassId<Schema_Event> | null>(event);

  const onResizeStart: ResizeStartCallback = useCallback(() => {
    setDraft(event);
    originalEvent.current = event;
  }, [event]);

  const onResize: ResizeCallback = useCallback((_e, direction, _ref, delta) => {
    if (!originalEvent.current) return;

    const slotMinute = MINUTES_PER_SLOT / SLOT_HEIGHT;

    const originalStart = dayjs(originalEvent.current.startDate);
    const originalEnd = dayjs(originalEvent.current.endDate);
    const dayStart = originalStart.startOf("day");

    const startDiffMinutes = originalStart.diff(dayStart, "minutes");
    const endDiffMinutes = originalEnd.diff(dayStart, "minutes");

    const originalTopPx = (startDiffMinutes / MINUTES_PER_SLOT) * SLOT_HEIGHT;
    const originalBottomPx = (endDiffMinutes / MINUTES_PER_SLOT) * SLOT_HEIGHT;

    if (direction === "top") {
      const clampedDelta = Math.min(delta.height, originalTopPx);
      const minutes = roundMinutesToNearestFifteen(clampedDelta * slotMinute);

      updateDraft({
        startDate: originalStart.subtract(minutes, "minutes").format(),
      });
    } else {
      const slotsPerDay = (24 * 60) / MINUTES_PER_SLOT;
      const totalDayHeightPx = slotsPerDay * SLOT_HEIGHT;
      const maxGrowthPx = totalDayHeightPx - originalBottomPx - SLOT_HEIGHT;
      const clampedDelta = Math.min(delta.height, maxGrowthPx);
      const minutes = roundMinutesToNearestFifteen(clampedDelta * slotMinute);

      updateDraft({
        endDate: originalEnd.add(minutes, "minutes").format(),
      });
    }
  }, []);

  const onResizeStop: ResizeCallback = useCallback(() => {
    const start = dayjs(event.startDate);
    const end = dayjs(event.endDate);
    const snappedStartMinute = roundToNearestFifteenWithinHour(start.minute());
    const snappedEndMinute = roundToNearestFifteenWithinHour(end.minute());

    const snappedStart = start.minute(snappedStartMinute).second(0);
    const snappedEnd = end.minute(snappedEndMinute).second(0);

    const eventFormOpen = nodeId$.getValue() === CursorItem.EventForm;
    const openAtCursor = open$.getValue();
    const storeEvent = selectEventById(store.getState(), event._id);
    const saveDraftOnly = eventFormOpen && openAtCursor && !storeEvent;

    const originalStart = dayjs(originalEvent.current?.startDate);
    const originalEnd = dayjs(originalEvent.current?.endDate);
    const startChanged = !snappedStart.isSame(originalStart);
    const endChanged = !snappedEnd.isSame(originalEnd);

    if (!startChanged && !endChanged) return;

    updateDraft({
      startDate: snappedStart.format(),
      endDate: snappedEnd.format(),
    });

    reorderGrid();

    if (saveDraftOnly) return;

    updateReduxEvent({
      event: {
        ...event,
        startDate: snappedStart.format(),
        endDate: snappedEnd.format(),
      } as Schema_GridEvent,
    });

    originalEvent.current = null;
  }, [event, updateReduxEvent]);

  return { onResizeStart, onResize, onResizeStop };
}

import { ResizeCallback, ResizeStartCallback } from "re-resizable";
import { useCallback, useRef, useState } from "react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CursorItem, nodeId$, open$ } from "@web/common/hooks/useOpenAtCursor";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { setDraft } from "@web/store/events";
import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";
import {
  roundMinutesToNearestFifteen,
  roundToNearestFifteenWithinHour,
} from "@web/views/Day/util/agenda/agenda.util";

export function useEventResizeActions(
  event: WithCompassId<Schema_Event>,
  bounds: HTMLElement,
) {
  const updateReduxEvent = useUpdateEvent();
  const [resizing, setResizing] = useState<boolean>(false);
  const originalEvent = useRef<WithCompassId<Schema_Event> | null>(event);
  const _id = event._id;

  const onResizeStart: ResizeStartCallback = useCallback(() => {
    setResizing(true);
    setDraft(event);
    originalEvent.current = event;
  }, [event]);

  const onResize: ResizeCallback = useCallback(
    (e, direction, _ref, delta) => {
      const boundsRect = bounds.getBoundingClientRect();
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (direction === "top" && clientY < boundsRect.top) return;
      if (direction === "bottom" && clientY > boundsRect.bottom - SLOT_HEIGHT) {
        return;
      }

      console.log("Resizing...", direction, clientY, boundsRect.bottom);

      const slotMinute = MINUTES_PER_SLOT / SLOT_HEIGHT;
      const minutes = roundMinutesToNearestFifteen(delta.height * slotMinute);
      const start = dayjs(originalEvent.current?.startDate);
      const end = dayjs(originalEvent.current?.endDate);

      if (direction === "top") {
        setDraft({
          _id,
          ...originalEvent.current,
          startDate: start.subtract(minutes, "minutes").format(),
        });
      } else {
        setDraft({
          _id,
          ...originalEvent.current,
          endDate: end.add(minutes, "minutes").format(),
        });
      }
    },
    [_id, bounds],
  );

  const onResizeStop: ResizeCallback = useCallback(() => {
    setResizing(false);

    const start = dayjs(event.startDate);
    const end = dayjs(event.endDate);
    const snappedStartMinute = roundToNearestFifteenWithinHour(start.minute());
    const snappedEndMinute = roundToNearestFifteenWithinHour(end.minute());

    const snappedStart = start.minute(snappedStartMinute).second(0);
    const snappedEnd = end.minute(snappedEndMinute).second(0);

    const eventFormOpen = nodeId$.getValue() === CursorItem.EventForm;
    const openAtCursor = open$.getValue();
    const saveDraftOnly = eventFormOpen && openAtCursor;

    const originalStart = dayjs(originalEvent.current?.startDate);
    const originalEnd = dayjs(originalEvent.current?.endDate);
    const startChanged = !snappedStart.isSame(originalStart);
    const endChanged = !snappedEnd.isSame(originalEnd);

    if (!startChanged && !endChanged) return;

    setDraft({
      ...event,
      startDate: snappedStart.format(),
      endDate: snappedEnd.format(),
    });

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

  return { onResizeStart, onResize, onResizeStop, resizing };
}

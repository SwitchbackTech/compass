import { useEffect, useMemo, useRef } from "react";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { selectEventEntities } from "@web/ducks/events/selectors/event.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export interface TodayEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  category?: string;
}

/**
 * Hook to fetch and format today's calendar events from Redux store
 * Returns events sorted by start time
 */
export function useTodayEvents(currentDate: Date = new Date()): TodayEvent[] {
  const dispatch = useAppDispatch();
  const eventEntities = useAppSelector(selectEventEntities);
  const hasFetchedRef = useRef(false);

  const todayEvents = useMemo(() => {
    // Get start and end of day
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter and format events for today
    const events: TodayEvent[] = Object.values(eventEntities)
      .filter((event: Schema_Event) => {
        if (!event || !event.startDate || !event.endDate || event.isSomeday) {
          return false;
        }

        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        // Include event if it overlaps with today
        return eventStart < endOfDay && eventEnd > startOfDay;
      })
      .map((event: Schema_Event) => ({
        id: event._id || "",
        title: event.title || "Untitled",
        startTime: new Date(event.startDate as string),
        endTime: new Date(event.endDate as string),
        isAllDay: event.isAllDay || false,
      }))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return events;
  }, [eventEntities, currentDate]);

  useEffect(() => {
    if (!hasFetchedRef.current && todayEvents.length === 0) {
      hasFetchedRef.current = true;
      dispatch(
        getDayEventsSlice.actions.request({
          startDate: toUTCOffset(dayjs().startOf("day")),
          endDate: toUTCOffset(dayjs().endOf("day")),
          __context: {
            reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE,
          },
        }),
      );
    }
  }, [dispatch, todayEvents.length]);

  return todayEvents;
}

import { useEffect, useMemo } from "react";
import { Schema_Event } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { selectEventEntities } from "@web/ducks/events/selectors/event.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export interface DayEventsResult {
  events: Schema_Event[];
  isLoading: boolean;
  error: string | null;
}

const buildDateRange = (date: Dayjs) => {
  const start = date.startOf("day");
  const end = date.endOf("day");

  return {
    start,
    end,
    startDate: toUTCOffset(start),
    endDate: toUTCOffset(end),
  };
};

const isEventInRange = (
  event: Schema_Event,
  rangeStart: Dayjs,
  rangeEnd: Dayjs,
) => {
  if (!event.startDate || !event.endDate) {
    return false;
  }

  const eventStart = dayjs(event.startDate);
  const eventEnd = dayjs(event.endDate);

  if (event.isAllDay) {
    return eventStart.isBefore(rangeEnd) && eventEnd.isAfter(rangeStart);
  }

  return (
    eventStart.isSameOrAfter(rangeStart) && eventEnd.isSameOrBefore(rangeEnd)
  );
};

export const useDayEvents = (date: Dayjs): DayEventsResult => {
  const dispatch = useAppDispatch();
  const dayEventsState = useAppSelector((state) => state.events.getDayEvents);
  const eventEntities = useAppSelector(selectEventEntities);

  const { start, end, startDate, endDate } = useMemo(
    () => buildDateRange(date),
    [date],
  );

  useEffect(() => {
    dispatch(
      getDayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  }, [dispatch, startDate, endDate]);

  const events = useMemo(() => {
    return Object.values(eventEntities)
      .filter((event): event is Schema_Event => Boolean(event?._id))
      .filter((event) => !event.isSomeday)
      .filter((event) => isEventInRange(event, start, end))
      .sort((a, b) =>
        dayjs(a.startDate as string).diff(dayjs(b.startDate as string)),
      );
  }, [eventEntities, start, end]);

  const isLoading = Boolean(dayEventsState?.isProcessing);
  let error: string | null = null;

  if (typeof dayEventsState?.error === "string") {
    error = dayEventsState.error;
  } else if (dayEventsState?.error) {
    error = "Unknown error";
  }

  return {
    events,
    isLoading,
    error,
  };
};

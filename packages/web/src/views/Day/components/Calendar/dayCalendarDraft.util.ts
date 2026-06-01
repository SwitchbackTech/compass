import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { positionAllDayDraftEvent } from "@web/common/calendar-grid/layout/allDayDraftEventPosition";
import { type CalendarGridVisibleDate } from "@web/common/calendar-grid/types/calendarGrid.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";

export const addVisibleDraftEvent = ({
  draft,
  events,
  isAllDay,
  visibleDates,
}: {
  draft: Schema_Event | null;
  events: Schema_GridEvent[];
  isAllDay: boolean;
  visibleDates: CalendarGridVisibleDate[];
}) => {
  if (
    !draft ||
    draft.isAllDay !== isAllDay ||
    !hasEventDates(draft) ||
    !isDraftVisibleOnDate(draft, visibleDates)
  ) {
    return events;
  }

  if (isAllDay) {
    return positionAllDayDraftEvent({ draft, events }).events;
  }

  const draftEvent = assembleGridEvent(draft);
  const existingIndex = events.findIndex((event) => event._id === draft._id);

  if (existingIndex === -1) {
    return [draftEvent, ...events];
  }

  const nextEvents = [...events];
  nextEvents[existingIndex] = {
    ...draftEvent,
    position: events[existingIndex].position,
    row: events[existingIndex].row,
  };

  return nextEvents;
};

export const getCalendarEventIdSet = (events: Schema_GridEvent[]) =>
  new Set(events.map((event) => event._id).filter(isString));

export const isDraftOnlyEvent = (
  event: Schema_GridEvent,
  draft: Schema_Event | null,
  savedEventIds: Set<string>,
) =>
  Boolean(
    event._id && event._id === draft?._id && !savedEventIds.has(event._id),
  );

export const isActiveDraftEvent = (
  event: Schema_GridEvent,
  draft: Schema_Event | null,
  savedEventIds: Set<string>,
) =>
  Boolean(
    event._id && event._id === draft?._id && savedEventIds.has(event._id),
  );

export const isDraftVisibleOnDate = (
  draft: EventWithDates,
  visibleDates: CalendarGridVisibleDate[],
) => {
  const visibleDate = visibleDates[0]?.date;

  if (!visibleDate) {
    return false;
  }

  if (!draft.isAllDay) {
    return dayjs(draft.startDate).isSame(visibleDate, "day");
  }

  const visibleDay = visibleDate.startOf("day");
  const start = dayjs(draft.startDate).startOf("day");
  const end = dayjs(draft.endDate).startOf("day");
  const inclusiveEnd = end.isAfter(start) ? end.subtract(1, "day") : start;

  return (
    visibleDay.isSame(start) ||
    visibleDay.isSame(inclusiveEnd) ||
    (visibleDay.isAfter(start) && visibleDay.isBefore(inclusiveEnd))
  );
};

const isString = (value: string | undefined): value is string =>
  typeof value === "string";

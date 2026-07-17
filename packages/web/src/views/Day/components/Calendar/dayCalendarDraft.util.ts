import { type CompassEvent } from "@core/types/compass-event.contracts";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { positionAllDayDraftEvent } from "@web/grid/layout/all-day-draft.position";
import { type GridVisibleDate } from "@web/grid/types/grid.types";

export const addVisibleDraftEvent = ({
  draft,
  events,
  isAllDay,
  visibleDates,
}: {
  draft: CompassEvent | null;
  events: GridEvent[];
  isAllDay: boolean;
  visibleDates: GridVisibleDate[];
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

export const getCalendarEventIdSet = (events: GridEvent[]) =>
  new Set(events.map((event) => event._id).filter(isString));

export const isDraftOnlyEvent = (
  event: GridEvent,
  draft: CompassEvent | null,
  savedEventIds: Set<string>,
) =>
  Boolean(
    event._id && event._id === draft?._id && !savedEventIds.has(event._id),
  );

export const isActiveDraftEvent = (
  event: GridEvent,
  draft: CompassEvent | null,
  savedEventIds: Set<string>,
) =>
  Boolean(
    event._id && event._id === draft?._id && savedEventIds.has(event._id),
  );

export const isDraftVisibleOnDate = (
  draft: EventWithDates,
  visibleDates: GridVisibleDate[],
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

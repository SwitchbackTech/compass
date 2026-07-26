import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isTimedEventMultiDay } from "@web/common/utils/event/event-nudge.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  getGridDraftId,
  gridEventDraftToGridEvent,
} from "@web/events/grid-event-draft.adapter";
import { positionAllDayDraftEvent } from "@web/grid/layout/all-day-draft.position";
import { type GridVisibleDate } from "@web/grid/types/grid.types";

export const addVisibleDraftEvent = ({
  draft,
  events,
  isAllDay,
  visibleDates,
}: {
  draft: GridEventDraft | null;
  events: GridEvent[];
  isAllDay: boolean;
  visibleDates: GridVisibleDate[];
}) => {
  if (
    !draft ||
    (draft.values.schedule.kind === "allDay") !== isAllDay ||
    !isDraftVisibleOnDate(draft, visibleDates)
  ) {
    return events;
  }

  if (isAllDay) {
    return positionAllDayDraftEvent({ draft, events }).events;
  }

  const schedule = draft.values.schedule;
  // Multi-day timed drafts stay represented by the promoted all-day bar;
  // injecting a timed card here overflows the day column.
  if (
    schedule.kind === "timed" &&
    isTimedEventMultiDay(dayjs(schedule.start), dayjs(schedule.end))
  ) {
    return events;
  }

  const draftEvent = gridEventDraftToGridEvent(draft);
  const draftId = getGridDraftId(draft);
  const existingIndex = events.findIndex((event) => event._id === draftId);

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
  draft: GridEventDraft | null,
  savedEventIds: Set<string>,
) => {
  const draftId = draft ? getGridDraftId(draft) : undefined;
  return Boolean(
    event._id && event._id === draftId && !savedEventIds.has(event._id),
  );
};

export const isActiveDraftEvent = (
  event: GridEvent,
  draft: GridEventDraft | null,
  savedEventIds: Set<string>,
) => {
  const draftId = draft ? getGridDraftId(draft) : undefined;
  return Boolean(
    event._id && event._id === draftId && savedEventIds.has(event._id),
  );
};

export const isDraftVisibleOnDate = (
  draft: GridEventDraft,
  visibleDates: GridVisibleDate[],
) => {
  const visibleDate = visibleDates[0]?.date;

  if (!visibleDate) {
    return false;
  }

  const { schedule } = draft.values;

  if (schedule.kind === "timed") {
    return dayjs(schedule.start).isSame(visibleDate, "day");
  }

  const visibleDay = visibleDate.startOf("day");
  const start = dayjs(schedule.start).startOf("day");
  const end = dayjs(schedule.end).startOf("day");
  const inclusiveEnd = end.isAfter(start) ? end.subtract(1, "day") : start;

  return (
    visibleDay.isSame(start) ||
    visibleDay.isSame(inclusiveEnd) ||
    (visibleDay.isAfter(start) && visibleDay.isBefore(inclusiveEnd))
  );
};

const isString = (value: string | undefined): value is string =>
  typeof value === "string";

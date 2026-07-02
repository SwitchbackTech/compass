import { Origin, Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_COMPACT_FORMAT } from "@core/constants/date.constants";
import { Status } from "@core/errors/status.codes";
import {
  Categories_Event,
  type Schema_Event,
  type Schema_Event_Recur_Base,
} from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/compass/session/session.util";
import { isBackendUnavailableError } from "@web/common/apis/util/backend-unavailable-error.util";
import {
  DATA_EVENT_ELEMENT_ID,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  type Schema_GridEvent,
  type Schema_WebEvent,
  type WithId,
} from "@web/common/types/web.event.types";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";

export const gridEventDefaultPosition: Schema_GridEvent["position"] = {
  isOverlapping: false,
  totalEventsInGroup: 1,
  widthMultiplier: 1,
  horizontalOrder: 1,
  initialX: null,
  initialY: null,
  dragOffset: { x: 0, y: 0 },
};

export const addId = (event: Schema_GridEvent): WithId<Schema_GridEvent> => {
  const _event = {
    ...event,
    _id: createObjectIdString(),
  } as WithId<Schema_GridEvent>;

  return _event;
};

export type EventWithDates = Schema_Event & {
  startDate: string;
  endDate: string;
};

export const hasEventDates = (event: Schema_Event): event is EventWithDates =>
  typeof event.startDate === "string" && typeof event.endDate === "string";

export const assembleWebEvent = (event: EventWithDates): Schema_WebEvent => ({
  ...event,
  startDate: event.startDate,
  endDate: event.endDate,
  origin: event.origin ?? Origin.COMPASS,
  priority: event.priority ?? Priorities.UNASSIGNED,
  user: event.user ?? "",
  recurrence: event.recurrence as Schema_WebEvent["recurrence"],
});

export const assembleDefaultEvent = async (
  draftType?: Categories_Event | null,
  startDate?: string,
  endDate?: string,
): Promise<Schema_Event | Schema_GridEvent> => {
  const userId = await getUserId();
  const baseEvent = _assembleBaseEvent(userId, {
    priority: Priorities.UNASSIGNED,
  });

  switch (draftType) {
    case Categories_Event.ALLDAY: {
      const defaultAllday: Schema_Event = {
        ...baseEvent,
        isAllDay: true,
        isSomeday: false,
        startDate,
        endDate: endDate ?? startDate,
      };
      return defaultAllday;
    }
    case Categories_Event.SOMEDAY_WEEK:
    case Categories_Event.SOMEDAY_MONTH: {
      const defaultSomeday: Schema_Event = {
        ...baseEvent,
        isAllDay: false,
        isSomeday: true,
        origin: Origin.COMPASS,
        ...(startDate && endDate ? { startDate, endDate } : {}),
      };
      return defaultSomeday;
    }
    case Categories_Event.TIMED: {
      const defaultTimed: Schema_GridEvent = {
        ...baseEvent,
        _id: baseEvent._id!,
        isAllDay: false,
        isSomeday: false,
        startDate: startDate!,
        endDate: endDate!,
        position: gridEventDefaultPosition,
        origin: baseEvent.origin ?? Origin.COMPASS,
        priority: baseEvent.priority ?? Priorities.UNASSIGNED,
        user: baseEvent.user!,
        recurrence:
          baseEvent.recurrence as Schema_Event_Recur_Base["recurrence"],
      };
      return defaultTimed;
    }
    default:
      return baseEvent;
  }
};

export const assembleGridEvent = (event: EventWithDates): Schema_GridEvent => {
  const gridEvent: Schema_GridEvent = {
    ...assembleWebEvent(event),
    position: gridEventDefaultPosition,
    _id: event._id!,
  };

  return gridEvent;
};

export const getEventDragOffset = (
  event?: Schema_GridEvent,
  e?: PartialMouseEvent,
): Schema_GridEvent["position"]["dragOffset"] => {
  if (!event || !e) return { x: 0, y: 0 };

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

export const getCategory = (event: Schema_Event) => {
  if (event?.isAllDay) {
    return Categories_Event.ALLDAY;
  }
  if (event?.isSomeday) {
    return Categories_Event.SOMEDAY_WEEK;
  }
  return Categories_Event.TIMED;
};

export const getCalendarEventIdFromElement = (element: HTMLElement) => {
  const eventElement = element.closest(`[${DATA_EVENT_ELEMENT_ID}]`);
  return eventElement ? eventElement.getAttribute(DATA_EVENT_ELEMENT_ID) : null;
};

export const getCalendarEventElementFromGrid = (
  eventId: string,
): Element | null => {
  const selector = `[${DATA_EVENT_ELEMENT_ID}="${eventId}"]`;
  const allDaySection = document.getElementById(ID_GRID_ALLDAY_ROW);
  const timedSection = document.getElementById(ID_GRID_MAIN);
  const timedEvent = timedSection?.querySelector(selector);

  return timedEvent ?? allDaySection?.querySelector(selector) ?? null;
};

/**
 * Refocuses an event's element after React replaces it, e.g. when migrating a
 * someday event moves it to another list. Retries across animation frames
 * until the new element appears, then focuses it.
 */
export const refocusEventElement = (eventId: string) => {
  const selector = `[${DATA_EVENT_ELEMENT_ID}="${eventId}"]`;
  const staleElement = document.querySelector(selector);
  let attemptsLeft = 30;

  const tryFocus = () => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && element !== staleElement) {
      element.focus();
    } else if (attemptsLeft-- > 0) {
      requestAnimationFrame(tryFocus);
    }
  };

  tryFocus();
};

export const getMonthListLabel = (start: Dayjs) => {
  return start.format("MMMM");
};

export const getWeekDayLabel = (day: Dayjs | Date) => {
  if (day instanceof Date) {
    return dayjs(day).format(YEAR_MONTH_DAY_COMPACT_FORMAT);
  }
  return day.format(YEAR_MONTH_DAY_COMPACT_FORMAT);
};

export const handleError = (error: Error) => {
  if (isBackendUnavailableError(error)) {
    return;
  }

  const codesToIgnore = [Status.NOT_FOUND, Status.GONE, Status.UNAUTHORIZED];
  const code = parseInt(error.message.slice(-3), 10);
  if (codesToIgnore.includes(code)) {
    // api interceptor will handle these
    return;
  }

  console.error(error);

  if (code === Status.INTERNAL_SERVER) {
    alert("Something went wrong behind the scenes. Please try again later.");
    reloadLocation();
  }

  alert(error);
};

export const isEventInRange = (
  eventDate: { start: string; end: string },
  rangeDate: { start: string; end: string },
) => {
  const isStartDateInRange = dayjs(eventDate.start).isBetween(
    rangeDate.start,
    rangeDate.end,
    "day",
    "[]",
  );
  const isEndDateInRange = dayjs(eventDate.end).isBetween(
    rangeDate.start,
    rangeDate.end,
    "day",
    "[]",
  );

  return isStartDateInRange || isEndDateInRange;
};

const _assembleBaseEvent = (
  userId: string,
  event: Partial<Schema_Event>,
): Schema_Event => {
  const baseEvent = {
    _id: event._id,
    title: event.title ?? "",
    description: event.description ?? "",
    startDate: event.startDate,
    endDate: event.endDate,
    user: userId,
    isAllDay: event.isAllDay ?? false,
    isSomeday: event.isSomeday ?? false,
    origin: event.origin ?? Origin.COMPASS,
    priority: event.priority ?? Priorities.UNASSIGNED,
  };

  return baseEvent;
};

export function compareEventsByTitle(a: Schema_Event, b: Schema_Event) {
  return (a.title ?? "").localeCompare(b.title ?? "");
}

export function compareEventsById(prev: Schema_Event, next: Schema_Event) {
  return prev._id?.localeCompare(next._id ?? "") ?? 0;
}

export function compareEventsByStartDate(
  prev: Schema_Event,
  next: Schema_Event,
) {
  const prevStart = dayjs(prev.startDate);
  const nextStart = dayjs(next.startDate);
  const before = prevStart.isBefore(nextStart);
  const after = prevStart.isAfter(nextStart);

  if (before) return -1;
  if (after) return 1;
  return 0;
}

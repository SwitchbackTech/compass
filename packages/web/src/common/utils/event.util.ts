import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { v4 as uuidv4 } from "uuid";
import { DropResult } from "@hello-pangea/dnd";
import { Origin, Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_COMPACT_FORMAT } from "@core/constants/date.constants";
import { Status } from "@core/errors/status.codes";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { validateEvent } from "@core/validators/event.validator";
import { getUserId } from "@web/auth/auth.util";
import { PartialMouseEvent } from "@web/common/types/util.types";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  DATA_EVENT_ELEMENT_ID,
  ID_OPTIMISTIC_PREFIX,
} from "../constants/web.constants";
import {
  Schema_GridEvent,
  Schema_OptimisticEvent,
  Schema_SomedayEventsColumn,
} from "../types/web.event.types";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export const assembleBaseEvent = (
  userId: string,
  event: Partial<Schema_Event>,
): Schema_Event => {
  const baseEvent = {
    _id: event._id,
    title: event.title || "",
    description: event.description || "",
    startDate: event.startDate || "",
    endDate: event.endDate || "",
    user: userId,
    isAllDay: event.isAllDay || false,
    isSomeday: event.isSomeday || false,
    origin: event.origin || Origin.COMPASS,
    priority: event.priority || Priorities.UNASSIGNED,
  };

  return baseEvent;
};

const gridEventDefaultPosition = {
  isOverlapping: false,
  widthMultiplier: 1,
  horizontalOrder: 1,
  initialX: null,
  initialY: null,
  dragOffset: { y: 0 },
};

export const assembleDefaultEvent = async (
  draftType: Categories_Event,
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
        endDate: startDate,
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
        isAllDay: false,
        isSomeday: false,
        startDate,
        endDate,
        position: gridEventDefaultPosition,
      };
      return defaultTimed;
    }
    default:
      return baseEvent;
  }
};

export const assembleGridEvent = (event: Schema_Event): Schema_GridEvent => {
  const gridEvent = {
    ...event,
    position: gridEventDefaultPosition,
  };
  return gridEvent;
};

export const getEventDragOffset = (
  event?: Schema_GridEvent,
  e?: PartialMouseEvent,
): Schema_GridEvent["position"]["dragOffset"] => {
  if (!event || !e) return { y: 0 };

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  return {
    y: e.clientY - rect.top,
  };
};

export const categorizeSomedayEvents = (
  somedayEvents: Schema_SomedayEventsColumn["events"],
  dates: { startDate: Dayjs; endDate: Dayjs },
): Schema_SomedayEventsColumn => {
  const sortedEvents = Object.values(somedayEvents).sort(
    (a, b) => a.order - b.order,
  );
  const weekIds: string[] = [];
  const monthIds: string[] = [];

  sortedEvents.forEach((e) => {
    const eventStart = dayjs(e.startDate);
    const isWeek = eventStart.isBetween(
      dates.startDate,
      dates.endDate,
      null,
      "[]",
    );
    if (isWeek) {
      weekIds.push(e._id);
      return;
    }

    const monthStartDate = dates.startDate.startOf("month");
    const monthEndDate = dates.startDate.endOf("month");
    const isMonthButNotWeek =
      !isWeek && eventStart.isBetween(monthStartDate, monthEndDate, null, "[]");

    if (isMonthButNotWeek) {
      monthIds.push(e._id);
    }
  });

  const sortedData: Schema_SomedayEventsColumn = {
    columns: {
      [`${COLUMN_WEEK}`]: {
        id: `${COLUMN_WEEK}`,
        eventIds: weekIds,
      },
      [`${COLUMN_MONTH}`]: {
        id: `${COLUMN_MONTH}`,
        eventIds: monthIds,
      },
    },
    columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
    events: somedayEvents,
  };
  return sortedData;
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
  const codesToIgnore = [Status.NOT_FOUND, Status.GONE, Status.UNAUTHORIZED];
  const code = parseInt(error.message.slice(-3));
  if (codesToIgnore.includes(code)) {
    // api interceptor will handle these
    return;
  }

  if (code === Status.INTERNAL_SERVER) {
    alert("Something went wrong behind the scenes. Please try again later.");
    window.location.reload();
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

export const isOptimisticEvent = (event: Schema_Event) => {
  const isOptimistic = event._id?.startsWith(ID_OPTIMISTIC_PREFIX) || false;
  return isOptimistic;
};

export const getSomedayEventCategory = (
  event: Schema_Event,
): Categories_Event.SOMEDAY_MONTH | Categories_Event.SOMEDAY_WEEK => {
  if (!event.isSomeday) {
    throw new Error(
      `Event is not a someday event. Event: ${JSON.stringify(event)}`,
    );
  }

  const startDate = dayjs(event.startDate);
  const endDate = dayjs(event.endDate);

  const diffInDays = endDate.diff(startDate, "day");

  if (diffInDays > 7) {
    return Categories_Event.SOMEDAY_MONTH;
  }
  return Categories_Event.SOMEDAY_WEEK;
};

export const prepEvtAfterDraftDrop = (
  category: Categories_Event,
  dropItem: DropResult,
  dates: { startDate: string; endDate: string },
) => {
  const baseEvent = assembleDefaultEvent(category);

  const event: Schema_Event = {
    ...baseEvent,
    description: dropItem.description,
    endDate: dates.endDate,
    origin: Origin.COMPASS,
    priority: dropItem.priority,
    title: dropItem.title,
    startDate: dates.startDate,
  };

  return event;
};

export const prepEvtBeforeSubmit = (
  draft: Schema_Event | Schema_GridEvent,
  userId: string,
) => {
  const _event = {
    ...draft,
    origin: Origin.COMPASS,
    user: userId,
  };

  const event = validateEvent(_event);
  return event;
};

export const replaceIdWithOptimisticId = (
  event: Schema_Event,
): Schema_OptimisticEvent => {
  const _event: Schema_OptimisticEvent = {
    ...event,
    _id: `${ID_OPTIMISTIC_PREFIX}-${uuidv4()}`,
  };

  return _event;
};

const _assembleBaseEvent = (
  userId: string,
  event: Partial<Schema_Event>,
): Schema_Event => {
  const baseEvent = {
    _id: event._id,
    title: event.title || "",
    description: event.description || "",
    startDate: event.startDate || "",
    endDate: event.endDate || "",
    user: userId,
    isAllDay: event.isAllDay || false,
    isSomeday: event.isSomeday || false,
    origin: event.origin || Origin.COMPASS,
    priority: event.priority || Priorities.UNASSIGNED,
  };

  return baseEvent;
};

export const handleDispatchGetWeekEvents = (
  startDate: string | Dayjs,
  endDate: string | Dayjs,
  reason: Sync_AsyncStateContextReason | Week_AsyncStateContextReason | null,
) => {
  const getRefreshWeekEventsReason = () => {
    if (reason === Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED) {
      // Hardcode enum return value for consistency and readability.
      return Week_AsyncStateContextReason.SOCKET_EVENT_CHANGED;
    } else if (reason === Week_AsyncStateContextReason.WEEK_VIEW_CHANGE) {
      return Week_AsyncStateContextReason.WEEK_VIEW_CHANGE;
    }

    return reason;
  };

  return getWeekEventsSlice.actions.request({
    startDate: toUTCOffset(startDate),
    endDate: toUTCOffset(endDate),
    __context: {
      reason: getRefreshWeekEventsReason(),
    },
  });
};

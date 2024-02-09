import { schema } from "normalizr";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { DropResult } from "@hello-pangea/dnd";
import { YEAR_MONTH_DAY_COMPACT_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";

import {
  Schema_GridEvent,
  Schema_SomedayEventsColumn,
} from "../types/web.event.types";
import { removeGridFields } from "./grid.util";
import { COLUMN_WEEK, COLUMN_MONTH } from "../constants/web.constants";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export const adjustIsTimesShown = (
  event: Schema_Event,
  isInPast: boolean,
  isCurrentWeek: boolean
) => {
  if (isCurrentWeek) {
    return isInPast
      ? { ...event, isTimesShown: false }
      : { ...event, isTimesShown: true };
  }
  if (isInPast) {
    return { ...event, isTimesShown: false };
  }

  return "isTimesShown" in event ? event : { ...event, isTimesShown: true };
};

export const categorizeSomedayEvents = (
  somedayEvents: Schema_SomedayEventsColumn["events"],
  dates: { startDate: Dayjs; endDate: Dayjs }
): Schema_SomedayEventsColumn => {
  const sortedEvents = Object.values(somedayEvents).sort(
    (a, b) => a.order - b.order
  );
  const weekIds: string[] = [];
  const monthIds: string[] = [];

  sortedEvents.forEach((e) => {
    const eventStart = dayjs(e.startDate);
    const isWeek = eventStart.isBetween(
      dates.startDate,
      dates.endDate,
      null,
      "[]"
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

export const getDefaultEvent = (
  draftType: Categories_Event,
  startDate?: string,
  endDate?: string
): Schema_GridEvent | null => {
  switch (draftType) {
    case Categories_Event.ALLDAY:
      return {
        isAllDay: true,
        isSomeday: false,
        priority: Priorities.UNASSIGNED,
        startDate,
        endDate: startDate,
      };
    case Categories_Event.SOMEDAY_WEEK || Categories_Event.SOMEDAY_MONTH:
      return {
        isAllDay: false,
        isSomeday: true,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
      };
    case Categories_Event.TIMED: {
      return {
        isAllDay: false,
        isSomeday: false,
        isTimesShown: true,
        priority: Priorities.UNASSIGNED,
        startDate,
        endDate,
      };
    }
    default:
      return null;
  }
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

  console.log(error.message);
  console.log(error.stack);
  console.log(error);
  alert(error);
};

export const prepEvtAfterDraftDrop = (
  category: Categories_Event,
  dropItem: DropResult,
  dates: { startDate: string; endDate: string }
) => {
  const baseEvent = getDefaultEvent(category);

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

export const prepEvtBeforeConvertToSomeday = (draft: Schema_GridEvent) => {
  const event = removeGridFields(draft);

  if (event.recurrence) {
    delete event.recurrence;
  }

  return event;
};

export const prepEvtBeforeSubmit = (draft: Schema_GridEvent) => {
  const _event = removeGridFields({ ...draft });

  const event = {
    ..._event,
    origin: Origin.COMPASS,
  } as Schema_Event;

  return event;
};

export const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

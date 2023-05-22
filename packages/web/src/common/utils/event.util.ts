import { schema } from "normalizr";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import { YEAR_MONTH_DAY_COMPACT_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";

import { Schema_GridEvent } from "../types/web.event.types";
import { removeGridFields } from "./grid.util";
import { DropResult } from "@hello-pangea/dnd";

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
  console.log(error.message);
  console.log(error.stack);
  console.log(error);

  const messageCode = parseInt(error.message.slice(-3));
  if (messageCode === Status.UNAUTHORIZED) {
    // SuperTokensWrapper will handle these
    return;
  }

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

export const prepEvtBeforeSubmit = (
  draft: Schema_GridEvent,
  original?: Schema_GridEvent
) => {
  let eventToClean: Schema_GridEvent = { ...original };
  if (!original) {
    eventToClean = { ...draft };
  }

  const _event = removeGridFields(eventToClean);
  const event = { ..._event, origin: Origin.COMPASS } as Schema_Event;

  return event;
};

export const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

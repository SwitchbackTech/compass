import { calendar_v3 } from "googleapis";
import mergeWith from "lodash.mergewith";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  EventStatus,
  ExtendedEventProperties,
  ExtendedEventPropertiesSchema,
  Schema_Event,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { isAllDay } from "@core/util/event/event.util";

/** Google Calendar event utilities */
export const isCancelledGCalEvent = (e: gSchema$Event): boolean =>
  e?.status === EventStatus.CANCELLED;

export const isGcalInstanceId = (
  e: Pick<gSchema$Event, "id" | "recurringEventId">,
): boolean =>
  typeof e.id === "string" &&
  new RegExp(`^${e.recurringEventId}_\\d+(T\\d+Z?)?$`, "i").test(e.id);

/**
 * isBaseGCalEvent
 *
 * Base gCal events have an `id` field and a non-empty `recurrence` array field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isBaseGCalEvent = ({
  id,
  recurrence,
  recurringEventId,
}: gSchema$Event): boolean =>
  typeof id === "string" &&
  Array.isArray(recurrence) &&
  typeof recurringEventId !== "string";

/**
 * isInstanceGCalEvent
 *
 * Recurring Instances of gCal events have an undefined `recurrence` field
 * and a specified `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isInstanceGCalEvent = (e: gSchema$Event): boolean =>
  typeof e.id === "string" &&
  !Array.isArray(e.recurrence) &&
  typeof e.recurringEventId === "string" &&
  isGcalInstanceId(e);

/**
 * isRegularGCalEvent
 *
 * Regular standalone gCal events have an undefined `recurrence` field
 * and an undefined `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isRegularGCalEvent = (e: gSchema$Event): boolean =>
  !isBaseGCalEvent(e) && !isInstanceGCalEvent(e);

export const getGcalEventDateFormat = (
  eventDateTime: calendar_v3.Schema$EventDateTime = {},
): string => {
  const isAllDay = "date" in eventDateTime;
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const format = isAllDay ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return format;
};

/**
 * gCalDateToDayjsDate
 *
 * parses gcal event date or dateTime into a Dayjs object
 *
 * the returned Dayjs object is in the timezone specified by the event
 *
 * you can convert it to system timezone by calling `.local()`
 */
export const gCalDateToDayjsDate = (
  eventDateTime: calendar_v3.Schema$EventDateTime = {},
): Dayjs => {
  const { date, dateTime, timeZone } = eventDateTime;

  if (!date && !dateTime) {
    throw new Error("`date` or `dateTime` must be defined");
  }

  const format = getGcalEventDateFormat(eventDateTime);
  const timezone = timeZone ?? dayjs.tz.guess();

  return dayjs(date ?? dateTime, format).tz(timezone);
};

export const eventDatesToGcalDates = (
  event: Pick<Schema_Event, "startDate" | "endDate" | "originalStartDate">,
  allDay = false,
): Pick<gSchema$Event, "start" | "end" | "originalStartTime"> => {
  const isAllDayEvent = allDay || isAllDay(event);
  const dateKey = isAllDayEvent ? "date" : "dateTime";
  const format = getGcalEventDateFormat({ [dateKey]: "" });
  const timeZone = dayjs.tz.guess();
  const startDate = dayjs(event.startDate).format(format);
  const endDate = dayjs(event.endDate).format(format);
  const start = { [dateKey]: startDate, timeZone };
  const end = { [dateKey]: endDate, timeZone };
  const dates = { start, end };

  if (event.originalStartDate) {
    const originalStartDate = dayjs(event.originalStartDate).format(format);
    const originalStartTime = { [dateKey]: originalStartDate, timeZone };

    Object.assign(dates, { originalStartTime });
  }

  return dates;
};

export const parseExtendedProperties = (
  gEvent: gSchema$Event,
  overrides: Partial<ExtendedEventProperties> = {},
): ExtendedEventProperties => {
  const defaultProps: ExtendedEventProperties = {
    origin: Origin.GOOGLE,
    priority: Priorities.UNASSIGNED,
  };

  const { data } = ExtendedEventPropertiesSchema.safeParse(
    gEvent.extendedProperties?.private,
  );

  return mergeWith(defaultProps, data, overrides);
};

export const gEventDefaults: Partial<gSchema$Event> = {
  summary: "untitled",
  description: "",
  start: {
    dateTime: "1990-01-01T00:00:00-10:00",
    timeZone: dayjs.tz.guess(),
  },
  end: {
    dateTime: "1990-01-01T00:00:00-10:00",
    timeZone: dayjs.tz.guess(),
  },
};

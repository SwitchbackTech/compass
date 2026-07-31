import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
  YMDHAM_FORMAT,
} from "@core/constants/date.constants";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import {
  type EventSchedule,
  EventScheduleSchema,
} from "@core/types/event.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ACCEPTED_TIMES } from "@web/common/constants/web.constants";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";

interface SelectedDates {
  startDate: Date;
  startTime: SelectOption<string>;
  endDate: Date;
  endTime: SelectOption<string>;
  isAllDay: boolean;
}

export const dateIsValid = (date: string) => {
  const notNaN = !Number.isNaN(new Date(date).getTime());

  const isValid = notNaN;

  return isValid;
};

export const getColorsByHour = (currentHour: number) => {
  const colors: string[] = [];

  [...(new Array(24) as number[])].map((_, index) => {
    // CSS variables (not hex) so the labels land in inline styles that
    // resolve against the active [data-theme].
    const isCurrentHour = currentHour - 1 === index;
    const color = isCurrentHour ? "var(--accent)" : "var(--text-muted)";

    colors.push(color);

    return dayjs()
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });

  return colors;
};

const getDayjsByTimeValue = (timeValue: string) => {
  return dayjs(`2000-01-01 ${timeValue}`, YMDHAM_FORMAT);
};

export const getHourLabels = (includeMidnight = false) => {
  const day = dayjs().startOf("day");
  const hours = includeMidnight ? 24 : 23;

  return [...(new Array(hours) as number[])].map((_, index) => {
    return day.add(index + 1, "hour").format(HOURS_AM_SHORT_FORMAT);
  });
};

const getTimeLabel = (value: string) => value.replace(":00", "");

export const getTimeOptionByValue = (date: Dayjs): TimeOption => {
  const value = dayjs(date).format(HOURS_AM_FORMAT);
  const label = getTimeLabel(value);

  return {
    label,
    value,
  };
};

export const getTimeOptions = (): TimeOption[] => {
  const options = ACCEPTED_TIMES.map((value) => {
    const label = getTimeLabel(value);

    return {
      label,
      value,
    };
  });

  return options;
};

export const getTimesLabel = (startDate: string, endDate: string) => {
  const start = _getTimeLabel(startDate);
  const end = _getTimeLabel(endDate);
  const startMinimal = _cleanStartMeridiem(start, end);

  const label = `${startMinimal} - ${end}`;

  return label;
};

export const getWeekRangeLabel = (weekStart: Dayjs, weekEnd: Dayjs) => {
  const isSameMonth = weekStart.month() === weekEnd.month();
  const start = weekStart.format("M.D");
  const end = weekEnd.format(isSameMonth ? "D" : "M.D");
  const label = `${start} - ${end}`;
  return label;
};

export const getCalendarHeadingLabel = (
  start: Dayjs,
  end: Dayjs,
  now: Dayjs,
) => {
  const startsThisYear = now.year() === start.year();
  const endsThisYear = now.year() === end.year();

  if (startsThisYear && endsThisYear) {
    return start.format("MMMM YYYY");
  } else if (startsThisYear || endsThisYear) {
    const startLabel = start.format("MMM YY");
    const endLabel = end.format("MMM YY");
    return `${startLabel} - ${endLabel}`;
  } else {
    return start.format("MMMM YYYY");
  }
};

// Browser IANA zone (e.g. "America/Chicago"), used to stamp timed schedules
// built from local form input (B_G).
export const getBrowserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const mapToBackend = (s: SelectedDates): EventSchedule => {
  if (s.isAllDay) {
    const startDate = dayjs(s.startDate).format(YEAR_MONTH_DAY_FORMAT);
    let endDate = dayjs(s.endDate).format(YEAR_MONTH_DAY_FORMAT);

    // A same-day selection is normalized to an exclusive end by adding one
    // day; a multi-day selection's end already represents an exclusive day.
    if (startDate === endDate) {
      endDate = dayjs(endDate).add(1, "day").format(YEAR_MONTH_DAY_FORMAT);
    }

    return EventScheduleSchema.parse({
      kind: "allDay",
      start: startDate,
      end: endDate,
    });
  }

  const timeZone = getBrowserTimeZone();
  const { startDate, endDate } = _addTimesToDates(s, timeZone);

  return EventScheduleSchema.parse({
    kind: "timed",
    start: startDate,
    end: endDate,
    timeZone,
  });
};

// uses inferred timezone and shortened string to
// convert to a string format that the backend/gcal/mongo accepts:
// '2022-02-04 12:15' -> '2022-02-04T12:15:00-06:00'
export const toUTCOffset = (date: string | Dayjs | Date) => {
  if (typeof date === "string" || date instanceof Date) {
    return dayjs(date).format();
  } else return date.format(); // then already a DayJs object
};

const _addTimesToDates = (dt: SelectedDates, timeZone: string) => {
  const start = getDayjsByTimeValue(dt.startTime.value);
  const startDate = dayjs
    .tz(dt.startDate, timeZone)
    .hour(start.hour())
    .minute(start.minute())
    .second(0)
    .millisecond(0)
    .format();

  const end = getDayjsByTimeValue(dt.endTime.value);
  const endDate = dayjs
    .tz(dt.startDate, timeZone)
    .hour(end.hour())
    .minute(end.minute())
    .second(0)
    .millisecond(0)
    .format();

  return { startDate, endDate };
};

// "6 AM" - "7 AM" reads as "6 - 7 AM": the start's meridiem is redundant when
// the end repeats it. trimEnd because dropping it also leaves the space that
// separated it, which the caller's " - " would double up on.
const _cleanStartMeridiem = (start: string, end: string) => {
  const meridiems = [start.slice(-2), end.slice(-2)];
  const verboseMeridiems = meridiems[0] === meridiems[1];
  if (verboseMeridiems) {
    return start.slice(0, -2).trimEnd();
  }
  return start;
};

const _getTimeLabel = (date: string) =>
  dayjs(date).format(HOURS_AM_FORMAT).replace(":00", "");

export const computeCurrentEventDateRange = (
  to: {
    duration: "week" | "month";
  },
  event: CompassEvent,
  weekViewRange: {
    startDate: string;
    endDate: string;
  },
): CompassEvent => {
  const reference = dayjs(weekViewRange.startDate);

  let start: Dayjs;
  let end: Dayjs;

  if (to.duration === "week") {
    start = dayjs(weekViewRange.startDate);
    end = dayjs(weekViewRange.endDate);
  } else {
    // duration is month
    start = reference.startOf("month");
    end = reference.endOf("month");
  }

  return {
    ...event,
    startDate: start.format(),
    endDate: end.format(),
  };
};

export const computeRelativeEventDateRange = (
  to: {
    direction: "prev" | "next";
    duration: "week" | "month";
  },
  event: CompassEvent,
): CompassEvent => {
  const reference = dayjs(event.startDate);

  let start: Dayjs;
  let end: Dayjs;

  if (to.duration === "week") {
    // For prev/next, use the provided week range as reference if available
    const weekRef = reference;
    start = weekRef.startOf("week");
    end = weekRef.endOf("week");

    if (to.direction === "prev") {
      start = start.subtract(1, "week");
      end = end.subtract(1, "week");
    } else if (to.direction === "next") {
      start = start.add(1, "week");
      end = end.add(1, "week");
    }
  } else {
    // duration is month
    start = reference.startOf("month");
    end = reference.endOf("month");

    if (to.direction === "prev") {
      start = start.subtract(1, "month");
      end = end.subtract(1, "month");
    } else if (to.direction === "next") {
      start = start.add(1, "month");
      end = end.add(1, "month");
    }
  }

  return {
    ...event,
    startDate: start.format(),
    endDate: end.format(),
  };
};

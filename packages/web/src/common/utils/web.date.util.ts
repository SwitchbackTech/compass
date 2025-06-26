import dayjs, { Dayjs } from "dayjs";
import { RRULE } from "@core/constants/core.constants";
import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
  YMDHAM_FORMAT,
  YMDHM_FORMAT,
} from "@core/constants/date.constants";
import {
  Categories_Event,
  Direction_Migrate,
  Schema_Event,
} from "@core/types/event.types";
import { Option_Time } from "@web/common/types/util.types";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import { roundToNext } from ".";
import { ACCEPTED_TIMES, OPTIONS_RECURRENCE } from "../constants/web.constants";
import { theme } from "../styles/theme";
import {
  Recurrence_Selection,
  Schema_SelectedDates,
} from "../types/web.event.types";

export const dateIsValid = (date: string) => {
  const notNaN = !Number.isNaN(new Date(date).getTime());

  const isValid = notNaN;

  return isValid;
};

export const getColorsByHour = (currentHour: number) => {
  const colors: string[] = [];

  [...(new Array(24) as number[])].map((_, index) => {
    const isCurrentHour = currentHour - 1 === index;
    const color = isCurrentHour
      ? theme.color.text.accent
      : theme.color.text.light;

    colors.push(color);

    return dayjs()
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });

  return colors;
};

export const getDatesByCategory = (
  category: Categories_Event,
  weekStart: Dayjs,
  weekEnd: Dayjs,
) => {
  if (category === Categories_Event.SOMEDAY_WEEK) {
    return {
      startDate: weekStart.format(YEAR_MONTH_DAY_FORMAT),
      endDate: weekEnd.format(YEAR_MONTH_DAY_FORMAT),
    };
  }

  if (category === Categories_Event.SOMEDAY_MONTH) {
    return {
      startDate: weekStart.startOf("month").format(YEAR_MONTH_DAY_FORMAT),
      endDate: weekStart.endOf("month").format(YEAR_MONTH_DAY_FORMAT),
    };
  }

  const { startDate, endDate } = _getNextWeekInSameMonth(weekStart);

  return {
    startDate: startDate.format(YEAR_MONTH_DAY_FORMAT),
    endDate: endDate.format(YEAR_MONTH_DAY_FORMAT),
  };
};

export const getDayjsByTimeValue = (timeValue: string) => {
  return dayjs(`2000-01-01 ${timeValue}`, YMDHAM_FORMAT);
};

export const getDurationLabel = (start: string, end: string) => {
  const _start = dayjs(`2000-00-00 ${start}`, YMDHM_FORMAT);

  const _end = dayjs(`2000-00-00 ${end}`, YMDHM_FORMAT);

  return _end.diff(_start, "minutes");
};

export const getEndTimeOptions = (): Option_Time[] => {
  const options = ACCEPTED_TIMES.map((value) => {
    const day = dayjs(`2000-00-00 ${value}`, YMDHM_FORMAT);

    const label = day.format(HOURS_AM_FORMAT).replace(":00", "");

    return {
      value,
      label: `${label} 18h 10m`,
    };
  });
  return options;
};

export const getHourLabels = () => {
  const day = dayjs();

  return [...(new Array(23) as number[])].map((_, index) => {
    return day
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });
};

export const getMigrationDates = (
  origDates: { startDate: string; endDate: string },
  category: Categories_Event,
  direction: Direction_Migrate,
) => {
  const dates =
    category === Categories_Event.SOMEDAY_WEEK
      ? _getWeeklyMigrationDates(origDates, direction)
      : _getMonthlyMigrationDates(origDates, direction);

  return {
    startDate: dates.startDate.format(YEAR_MONTH_DAY_FORMAT),
    endDate: dates.endDate.format(YEAR_MONTH_DAY_FORMAT),
  };
};

export const getNextIntervalTimes = () => {
  const currentMinute = dayjs().minute();
  const nextInterval = roundToNext(currentMinute, GRID_TIME_STEP);
  const start = dayjs().minute(nextInterval).second(0);
  const end = start.add(1, "hour");
  const startDate = start.format();
  const endDate = end.format();

  return { startDate, endDate };
};

export const getRecurrenceRule = (selection: Recurrence_Selection) => {
  switch (selection) {
    case Recurrence_Selection.WEEK:
      return [RRULE.WEEK];
      break;
    case Recurrence_Selection.MONTH:
      return [RRULE.MONTH];
      break;
    default:
      throw Error("Invalid selection");
  }
};

export const getRecurrenceOption = (rrule: string) => {
  switch (rrule) {
    case RRULE.WEEK:
      return OPTIONS_RECURRENCE.WEEK;
      break;
    case RRULE.WEEKS_2:
      return OPTIONS_RECURRENCE.WEEKS_2;
      break;
    case RRULE.WEEKS_3:
      return OPTIONS_RECURRENCE.WEEKS_3;
      break;
    case RRULE.MONTH:
      return OPTIONS_RECURRENCE.MONTH;
      break;
    default:
      throw Error(`Invalid RRule: ${rrule.toString()}`);
  }
};

export const getTimeLabel = (value: string) => value.replace(":00", "");

export const getTimeOptionByValue = (date: Dayjs): Option_Time => {
  const value = dayjs(date).format(HOURS_AM_FORMAT);
  const label = getTimeLabel(value);

  return {
    label,
    value,
  };
};

export const getTimeOptions = (): Option_Time[] => {
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
  const label = start + " - " + end;
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

export const mapToBackend = (s: Schema_SelectedDates) => {
  if (s.isAllDay) {
    return {
      startDate: dayjs(s.startDate).format(YEAR_MONTH_DAY_FORMAT),
      endDate: dayjs(s.endDate).format(YEAR_MONTH_DAY_FORMAT),
    };
  }

  const { startDate, endDate } = _addTimesToDates(s);

  return { startDate, endDate };
};

// uses inferred timezone and shortened string to
// convert to a string format that the backend/gcal/mongo accepts:
// '2022-02-04 12:15' -> '2022-02-04T12:15:00-06:00'
export const toUTCOffset = (date: string | Dayjs | Date) => {
  if (typeof date === "string" || date instanceof Date) {
    return dayjs(date).format();
  } else return date.format(); // then already a DayJs object
};

const _addTimesToDates = (dt: Schema_SelectedDates) => {
  const start = getDayjsByTimeValue(dt.startTime.value);
  const startDate = dayjs(dt.startDate)
    .hour(start.hour())
    .minute(start.minute())
    .format();

  const end = getDayjsByTimeValue(dt.endTime.value);
  const endDate = dayjs(dt.startDate)
    .hour(end.hour())
    .minute(end.minute())
    .format();

  return { startDate, endDate };
};

const _cleanStartMeridiem = (start: string, end: string) => {
  const meridiems = [start.slice(-2), end.slice(-2)];
  const verboseMeridiems = meridiems[0] === meridiems[1];
  if (verboseMeridiems) {
    return start.slice(0, -2);
  }
  return start;
};

const _getNextWeekInSameMonth = (weekStart: Dayjs) => {
  let startDate: Dayjs;

  const startOfMonth = weekStart.startOf("month");
  const nextWeek = weekStart.add(1, "week");
  const nextWeekStartOfMonth = nextWeek.startOf("month");

  if (nextWeekStartOfMonth.isSame(startOfMonth, "month")) {
    startDate = nextWeek;
  } else {
    startDate = weekStart.subtract(1, "week");
  }

  const endDate = startDate.add(6, "days");

  return { startDate, endDate };
};

const _getTimeLabel = (date: string) => {
  const orig = dayjs(date).format(HOURS_AM_FORMAT);
  return orig.replace(":00", "");
};

const _getMonthlyMigrationDates = (
  origDates: { startDate: string; endDate: string },
  direction: Direction_Migrate,
) => {
  const WEEK_START = 0;
  let startDate: Dayjs;

  if (direction === "forward") {
    const nextMonth = dayjs(origDates.startDate)
      .startOf("month")
      .add(1, "month");
    const buffer = 7; //ensures it's in the next month
    const firstXOfNextMonth = nextMonth.day(WEEK_START + buffer);
    startDate = firstXOfNextMonth;
  } else {
    const prevMonth = dayjs(origDates.startDate)
      .startOf("month")
      .subtract(1, "month");
    const lastDayOfMonth = prevMonth.endOf("month");
    const lastXOfMonth = lastDayOfMonth.day(WEEK_START);

    if (lastDayOfMonth.date() < lastXOfMonth.date()) {
      lastXOfMonth.subtract(7, "days");
    }

    startDate = lastXOfMonth;
  }

  const endDate = startDate.add(6, "days");

  return { startDate, endDate };
};

const _getWeeklyMigrationDates = (
  origDates: { startDate: string; endDate: string },
  direction: Direction_Migrate,
) => {
  const diff = direction === "forward" ? 7 : -7;

  const startDate = dayjs(origDates.startDate).add(diff, "days");
  const endDate = dayjs(origDates.endDate).add(diff, "days");

  return { startDate, endDate };
};

export const setEventStartEndDatesToCurrentWeek = (
  event: Schema_Event,
): Schema_Event => {
  const weekStart = dayjs(new Date()).startOf("week");
  const weekEnd = dayjs(new Date()).endOf("week");

  return {
    ...event,
    startDate: weekStart.format(),
    endDate: weekEnd.format(),
  };
};

export const setEventStartEndDatesToCurrentMonth = (
  event: Schema_Event,
): Schema_Event => {
  const monthStart = dayjs(new Date()).startOf("month");
  const monthEnd = dayjs(new Date()).endOf("month");

  return {
    ...event,
    startDate: monthStart.format(),
    endDate: monthEnd.format(),
  };
};

export const computeEventDateRange = (
  to: {
    direction: "prev" | "next" | "current";
    duration: "week" | "month";
  },
  event: Schema_Event,
): Schema_Event => {
  const reference =
    to.direction === "current" ? dayjs(new Date()) : dayjs(event.startDate);

  let start: Dayjs;
  let end: Dayjs;

  if (to.duration === "week") {
    start = reference.startOf("week");
    end = reference.endOf("week");

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

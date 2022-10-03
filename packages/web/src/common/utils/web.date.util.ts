import dayjs, { Dayjs } from "dayjs";
import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
  YMDHM_FORMAT,
  YMDHAM_FORMAT,
} from "@web/common/constants/date.constants";
import { Option_Time } from "@web/common/types/util.types";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";

import { roundToNext } from ".";
import { ACCEPTED_TIMES } from "../constants/web.constants";

export const dateIsValid = (date: string) => {
  const notNaN = !Number.isNaN(new Date(date).getTime());

  const isValid = notNaN;

  return isValid;
};

export const shouldAdjustComplimentTime = (
  changed: "start" | "end",
  vals: { oldStart: string; oldEnd: string; start: string; end: string }
) => {
  let shouldAdjust: boolean;
  let duration: number;
  let step: number;
  let compliment: Dayjs;

  const { oldStart, oldEnd, start, end } = vals;

  const _start = dayjs(`2000-01-01 ${start}`, YMDHAM_FORMAT);
  const _end = dayjs(`2000-01-01 ${end}`, YMDHAM_FORMAT);
  const isSame = _start.isSame(_end);

  if (changed === "start") {
    shouldAdjust = _start.isAfter(_end) || isSame;

    if (shouldAdjust) {
      const _oldStart = dayjs(`2000-01-01 ${oldStart}`, YMDHAM_FORMAT);
      const _oldEnd = dayjs(`2000-01-01 ${oldEnd}`, YMDHAM_FORMAT);
      duration = Math.abs(_oldStart.diff(_oldEnd, "minutes"));

      step = Math.abs(_start.diff(_end, "minutes"));

      compliment = dayjs(`2000-01-01 ${end}`, YMDHAM_FORMAT);
    }
  }

  if (changed === "end") {
    shouldAdjust = _end.isBefore(_start) || isSame;

    if (shouldAdjust) {
      const _oldStart = dayjs(`2000-01-01 ${oldStart}`, YMDHAM_FORMAT);
      const _oldEnd = dayjs(`2000-01-01 ${oldEnd}`, YMDHAM_FORMAT);
      duration = Math.abs(_oldStart.diff(_oldEnd, "minutes"));

      step = Math.abs(_start.diff(_end, "minutes"));

      compliment = dayjs(`2000-01-01 ${start}`, YMDHAM_FORMAT);
    }
  }

  const adjustment = duration + step;

  return { shouldAdjust, adjustment, compliment };
};

export const getColorsByHour = (currentHour: number) => {
  const colors: string[] = [];

  [...(new Array(23) as number[])].map((_, index) => {
    // + 1 cuz comparing labels (23 intervals) vs hours in day (24)
    const isCurrentHour = currentHour === index + 1;
    const color = isCurrentHour
      ? getColor(ColorNames.TEAL_3)
      : `${getColor(ColorNames.WHITE_4)}80`;

    colors.push(color);

    return dayjs()
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });

  return colors;
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

export const getNextIntervalTimes = () => {
  const currentMinute = dayjs().minute();
  const nextInterval = roundToNext(currentMinute, GRID_TIME_STEP);
  const start = dayjs().minute(nextInterval).second(0);
  const end = start.add(1, "hour");
  const startDate = start.format();
  const endDate = end.format();

  return { startDate, endDate };
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

// uses inferred timezone and shortened string to
// convert to a string format that the backend/gcal/mongo accepts:
// '2022-02-04 12:15' -> '2022-02-04T12:15:00-06:00'
export const toUTCOffset = (date: string | Dayjs | Date) => {
  if (typeof date === "string" || date instanceof Date) {
    return dayjs(date).format();
  } else return date.format(); // then already a DayJs object
};

const _cleanStartMeridiem = (start: string, end: string) => {
  const meridiems = [start.slice(-2), end.slice(-2)];
  const verboseMeridiems = meridiems[0] === meridiems[1];
  if (verboseMeridiems) {
    return start.slice(0, -2);
  }
  return start;
};

const _getTimeLabel = (date: string) => {
  const orig = dayjs(date).format(HOURS_AM_FORMAT);
  return orig.replace(":00", "");
};

/*
export const getTimes = () =>
  Array(24 * 4)
    .fill(0)
    .map((_, i) => {
      // eslint-disable-next-line no-bitwise
      return `0${~~(i / 4)}:0${60 * ((i / 4) % 1)}`.replace(/\d(\d\d)/g, "$1");
    });
*/

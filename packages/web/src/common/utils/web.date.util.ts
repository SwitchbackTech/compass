import dayjs, { Dayjs } from "dayjs";
import { SelectOption } from "@web/common/types/components";
import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/date.constants";
import { Option_Time } from "@web/common/types/util.types";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";

import { roundToNext } from ".";
import { ACCEPTED_TIMES } from "../constants/web.constants";

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

export const getDurationLabel = (start: string, end: string) => {
  const _start = dayjs(
    `2000-00-00 ${start}`,
    YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
  );

  const _end = dayjs(`2000-00-00 ${end}`, YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);

  return _end.diff(_start, "minutes");
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

export const getTimes = () =>
  Array(24 * 4)
    .fill(0)
    .map((_, i) => {
      // eslint-disable-next-line no-bitwise
      return `0${~~(i / 4)}:0${60 * ((i / 4) % 1)}`.replace(/\d(\d\d)/g, "$1");
    });

export const getTimeOptions = (): Option_Time[] => {
  const options = ACCEPTED_TIMES.map((value) => {
    const day = dayjs(
      `2000-00-00 ${value}`,
      YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
    );

    const label = day.format(HOURS_AM_FORMAT).replace(":00", "");

    return {
      value,
      label,
    };
  });
  //++filter current time?
  return options;
};

export const getEndTimeOptions = (): Option_Time[] => {
  const options = ACCEPTED_TIMES.map((value) => {
    const day = dayjs(
      `2000-00-00 ${value}`,
      YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
    );

    const label = day.format(HOURS_AM_FORMAT).replace(":00", "");

    return {
      value,
      label: `${label} 18h 10m`,
    };
  });
  //++filter current time?
  return options;
};

//++ remove once done
export const getSortedTimes = (
  option: SelectOption<string> | undefined,
  method: "isAfter" | "isBefore"
) => {
  const options = ACCEPTED_TIMES.map((value) => {
    const day = dayjs(
      `2000-00-00 ${value}`,
      YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
    );

    return {
      value,
      label: day.format(HOURS_AM_FORMAT),
    };
  });

  if (!option) return options;

  const collocativeMoment = dayjs(
    `2000-00-00 ${option.value}`,
    YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
  );

  return options.filter((time) => {
    const timeMoment = dayjs(
      `2000-00-00 ${time.value}`,
      YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
    );
    return (
      // timeMoment[method](collocativeMoment) ||
      !timeMoment.isSame(collocativeMoment)
    );
  });
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

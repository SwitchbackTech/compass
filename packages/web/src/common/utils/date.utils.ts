import dayjs, { Dayjs } from "dayjs";
import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
import { ColorNames } from "@web/common/types/styles";
import { Colors } from "@web/common/styles/colors";

import { getColor } from "./colors";

export const getAmPmTimes = () =>
  getTimes().map((time) =>
    dayjs(`2000-00-00 ${time}`, YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT)
      .format(HOURS_AM_FORMAT)
      .toLowerCase()
  );

export const getTimes = () =>
  Array(24 * 4)
    .fill(0)
    .map((_, i) => {
      // eslint-disable-next-line no-bitwise
      return `0${~~(i / 4)}:0${60 * ((i / 4) % 1)}`.replace(/\d(\d\d)/g, "$1");
    });

export const getHourlyTimes = () => {
  const day = dayjs();
  return [...(new Array(23) as number[])].map((_, index) => {
    return day
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });
};

export const getHourlyTimesDynamic = (now: Dayjs) => {
  const currentHour = now.hour();

  const colors: Colors[] = [];

  const timeLabels = [...(new Array(23) as number[])].map((_, index) => {
    // + 1 cuz comparing labels (23 intervals) vs hours in day (24)
    const isCurrentHour = currentHour === index + 1;
    const color = isCurrentHour
      ? getColor(ColorNames.TEAL_3)
      : `${getColor(ColorNames.WHITE_4)}80`;

    colors.push(color);

    return now
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });

  return { timeLabels, colors };
};

// uses inferred timezone and shortened string to
// convert to a format that the backend/gcal/mongo accepts:
// '2022-02-04 12:15' -> '2022-02-04T12:15:00-06:00'
export const toUTCOffset = (date: string | Dayjs) => {
  if (typeof date === "string") {
    return dayjs(date).format();
  } else return date.format(); // then already a DayJs object
};

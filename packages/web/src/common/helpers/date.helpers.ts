import dayjs from "dayjs";

import {
  SHORT_HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";

// uses inferred timezone and shortened string to
// convert to a format that the backend/gcal/mongo accepts:
// '2022-02-04 12:15' -> '2022-02-04T12:15:00-06:00'
export const toUTCOffset = (shortDate: string) => dayjs(shortDate).format();

export const getAmPmTimes = () =>
  getTimes().map((time) =>
    dayjs(`2000-00-00 ${time}`, YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT)
      .format(SHORT_HOURS_AM_FORMAT)
      .toLowerCase()
  );

export const getTimes = () =>
  Array(24 * 4)
    .fill(0)
    .map((_, i) => {
      // eslint-disable-next-line no-bitwise
      return `0${~~(i / 4)}:0${60 * ((i / 4) % 1)}`.replace(/\d(\d\d)/g, "$1");
    });

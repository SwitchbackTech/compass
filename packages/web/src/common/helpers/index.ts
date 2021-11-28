import dayjs from 'dayjs';

import {
  SHORT_HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from '@common/constants/dates';

export const getTimes = () =>
  Array(24 * 4)
    .fill(0)
    .map((_, i) => {
      // eslint-disable-next-line no-bitwise
      return `0${~~(i / 4)}:0${60 * ((i / 4) % 1)}`.replace(/\d(\d\d)/g, '$1');
    });

export const getAmPmTimes = () =>
  getTimes().map((time) =>
    dayjs(`2000-00-00 ${time}`, YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT)
      .format(SHORT_HOURS_AM_FORMAT)
      .toLowerCase()
  );

export const roundByNumber = (number: number, roundBy: number): number =>
  Math.ceil(number / roundBy) * roundBy;

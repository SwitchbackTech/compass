import { ObjectId } from "bson";
import { Schema_Event, Schema_Regular_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockRegularEvent } from "@core/util/test/ccal.event.factory";

const calendar = new ObjectId();

// Single-day someday (keeping original intent; corrected date format)
const somedayEvents: Schema_Regular_Event[] = [
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 2021",
      isSomeday: true,
      startDate: dayjs(
        "2021-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
];

// All-day and timed events (2021/2022/2023)
const regularEvents: Schema_Regular_Event[] = [
  // Jan 1 2021 all-day
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 2021",
      isSomeday: false,
      startDate: dayjs(
        "2021-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
  // Jan 1 2021 (times)
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 2021 (times)",
      isSomeday: false,
      startDate: dayjs("2021-01-01T12:12:12-12:00").toDate(),
    },
    false,
  ),
  // Dec 31
  createMockRegularEvent(
    {
      calendar,
      title: "Dec 30",
      isSomeday: false,
      startDate: dayjs(
        "2021-12-31",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
  ),
  // Dec 31 - Feb 2
  createMockRegularEvent(
    {
      calendar,
      title: "Dec 31 - Feb 2",
      isSomeday: false,
      startDate: dayjs(
        "2021-12-31",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 33 },
  ),
  // Dec 31 - Jan 1
  createMockRegularEvent(
    {
      calendar,
      title: "Dec 31 - Jan 1",
      isSomeday: false,
      startDate: dayjs(
        "2021-12-31",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 2 },
  ),
  // Jan 1
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
  // Jan 1 (times)
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 (times)",
      isSomeday: false,
      startDate: dayjs("2022-01-01T00:00:00+03:00").toDate(),
    },
    true,
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 (UTC times)",
      isSomeday: false,
      startDate: dayjs("2022-01-01T00:11:00Z").toDate(),
    },
    true,
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 - Jan 3",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 3 },
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 - Jan 3 (times)",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01T11:11:11+11:00",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 3 },
  ),
  // Jan 1 - Jan 21
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 - Jan 21",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 21 },
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 - Jan 21 (times)",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01T00:00:00+06:00",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 21 },
  ),
  // Jan 1 - Apr 20
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 - Apr 20",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 110 },
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 - Apr 20 (times)",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01T04:30:00-02:00",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 110 },
  ),
  // Jan 1 2022 - Jan 1 2023
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 2022 - Jan 1 2023",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "year", value: 1 },
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 2022 - Jan 1 2023 (times)",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-01T04:30:00-02:00",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "year", value: 1 },
  ),
  // Jan 2
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 2",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-02",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
  // Jan 3
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 3",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-03",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
  // Jan 3 - Feb 3
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 3 - Feb 3",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-03",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "month", value: 1 },
  ),
  // Jan 4
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 4",
      isSomeday: false,
      startDate: dayjs(
        "2022-01-04",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
  // Jan 1 2023
  createMockRegularEvent(
    {
      calendar,
      title: "Jan 1 2023",
      isSomeday: false,
      startDate: dayjs(
        "2023-01-01",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
];

export const mockEventSetJan22: Schema_Event[] = [
  ...somedayEvents,
  ...regularEvents,
];

import { ObjectId } from "bson";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event, Schema_Regular_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockRegularEvent } from "@core/util/test/ccal.event.factory";

const calendar = new ObjectId();

const allDayEventsThatShouldMatch: Schema_Regular_Event[] = [
  createMockRegularEvent(
    {
      calendar,
      title: "Feb 22",
      isSomeday: false,
      startDate: dayjs(
        "2022-02-22",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Feb 14 - Mar 8",
      isSomeday: false,
      startDate: dayjs(
        "2022-02-14",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    false,
    { unit: "day", value: 22 },
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Mar 8",
      isSomeday: false,
      startDate: dayjs(
        "2022-03-08",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
    },
    true,
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Mar 10 - 12",
      isSomeday: false,
      startDate: dayjs(
        "2022-03-10",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
      priority: Priorities.WORK,
    },
    false,
    { unit: "day", value: 3 },
  ), // exclusive (covers 10,11,12)
];

const allDayEventsThatShouldNotMatch: Schema_Event[] = [
  createMockRegularEvent(
    {
      calendar,
      title: "Feb 28 - Mar 5",
      isSomeday: false,
      startDate: dayjs(
        "2022-02-28",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
      priority: Priorities.WORK,
    },
    false,
    { unit: "day", value: 5 },
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Mar 5",
      isSomeday: false,
      startDate: dayjs(
        "2022-03-05",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
      priority: Priorities.WORK,
    },
    false,
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Mar 13",
      isSomeday: false,
      startDate: dayjs(
        "2022-03-13",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
      priority: Priorities.WORK,
    },
    true,
  ),
  createMockRegularEvent(
    {
      calendar,
      title: "Mar 13 - 16",
      isSomeday: false,
      startDate: dayjs(
        "2022-03-13",
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      ).toDate(),
      priority: Priorities.WORK,
    },
    false,
    { unit: "day", value: 4 },
  ), // exclusive
];

export const mockEventSetMar22: Schema_Event[] = [
  ...allDayEventsThatShouldMatch,
  ...allDayEventsThatShouldNotMatch,
];

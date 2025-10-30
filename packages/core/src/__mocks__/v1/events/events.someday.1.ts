import { Schema_SomedayEvent } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockRegularEvent } from "@core/util/test/ccal.event.factory";
import { mockEventSetJan22 } from "./events.22jan";

const calendar = mockEventSetJan22[0]?.calendar;

export const mockEventSetSomeday1: Schema_SomedayEvent[] = [
  {
    ...createMockRegularEvent(
      {
        calendar,
        title: "Multi-Month 1",
        startDate: dayjs(
          "2023-05-28",
          dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
        ).toDate(),
      },
      false,
      { unit: "day", value: 6 },
    ),
    isSomeday: true,
  },
  {
    ...createMockRegularEvent(
      {
        calendar,
        title: "Multi-Month 2",
        startDate: dayjs(
          "2023-01-28",
          dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
        ).toDate(),
      },
      false,
      { unit: "month", value: 4 },
    ),
    isSomeday: true,
  },
  {
    ...createMockRegularEvent(
      {
        calendar,
        title: "First Sunday of New Month",
        startDate: dayjs(
          "2023-06-04",
          dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
        ).toDate(),
      },
      true,
    ),
    isSomeday: true,
  },
  {
    ...createMockRegularEvent(
      {
        calendar,
        title: "Distant Future",
        startDate: dayjs(
          "2023-01-06",
          dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
        ).toDate(),
      },
      false,
      { unit: "days", value: 726 },
    ),
    isSomeday: true,
  },
  {
    ...createMockRegularEvent(
      {
        calendar,
        title: "Distant Past",
        startDate: dayjs(
          "1999-01-01",
          dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
        ).toDate(),
      },
      false,
      { unit: "days", value: 5 },
    ),
    isSomeday: true,
  },
  {
    ...createMockRegularEvent(
      {
        calendar,
        title: "Beginning of Month",
        startDate: dayjs(
          "2023-10-01",
          dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
        ).toDate(),
      },
      false,
      { unit: "day", value: 6 },
    ),
    isSomeday: true,
  },
];

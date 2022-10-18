import { dayjs } from "dayjs";

import { Schema_Event } from "../types/event.types";

const mapToBackend = (end: Date, start: Date, isAllDay: boolean) => {
  if (isAllDay) {
    const adjustedEnd = dayjs(end).add(1, "day");

    return {
      startDate: dayjs(start).format(YEAR_MONTH_DAY_FORMAT),
      endDate: adjustedEnd.format(YEAR_MONTH_DAY_FORMAT),
    };
  }

  const { startDate, endDate } = addTimesToDates();
  return { startDate, endDate };
};

import dayjs from "dayjs";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { getTimeOptionByValue } from "@web/common/utils/web.date.util";

export const adjustEndDate = (end: Date) => {
  // Given an all-day event that starts and ends on December 25,
  // the event form should show a start of "2025-12-25" and an end of "2025-12-25",
  // and the backend should store the start as "2025-12-25" and the end as"2025-12-26".
  // Adding one day to the end here helps us achieve that requirement.
  const endPlusOne = dayjs(end).add(1, "day");

  const formattedEndDate = endPlusOne.format(YEAR_MONTH_DAY_FORMAT);
  const datePickerDate = endPlusOne.toDate();
  return { datePickerDate, formattedEndDate };
};

export const getFormDates = (startDate: string, endDate: string) => {
  const start = dayjs(startDate);
  const startTime = getTimeOptionByValue(start);
  const _startDate = start.toDate();

  const end = dayjs(endDate);
  const isOneDay = start.format(YEAR_MONTH_DAY_FORMAT) === endDate;
  const displayEndDate = isOneDay
    ? start.format(YEAR_MONTH_DAY_FORMAT)
    : end.subtract(1, "day").format(YEAR_MONTH_DAY_FORMAT);
  const _endDate = isOneDay ? start.toDate() : end.toDate();
  const endTime = getTimeOptionByValue(end);

  return {
    startDate: _startDate,
    startTime,
    endDate: _endDate,
    displayEndDate,
    endTime,
  };
};

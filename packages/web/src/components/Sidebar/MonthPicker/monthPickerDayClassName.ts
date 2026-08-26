import { type Dayjs } from "@core/util/date/dayjs";

export const MONTH_PICKER_IN_VIEW_CLASS = "react-datepicker__day--in-view";
export const MONTH_PICKER_IN_VIEW_START_CLASS =
  "react-datepicker__day--in-view-start";
export const MONTH_PICKER_IN_VIEW_END_CLASS =
  "react-datepicker__day--in-view-end";

export function getMonthPickerDayClassName({
  date,
  selectedDate,
  viewEnd,
  viewStart,
}: {
  date: Dayjs;
  selectedDate: Dayjs;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}): string {
  const isSelected = date.isSame(selectedDate, "day");
  const classes = [isSelected ? "!font-semibold" : "!font-light"];

  if (!date.isBetween(viewStart, viewEnd, "day", "[]")) {
    return classes.join(" ");
  }

  classes.push(MONTH_PICKER_IN_VIEW_CLASS);

  if (
    date.isSame(viewStart, "day") ||
    date.isSame(date.startOf("week"), "day")
  ) {
    classes.push(MONTH_PICKER_IN_VIEW_START_CLASS);
  }

  if (date.isSame(viewEnd, "day") || date.isSame(date.endOf("week"), "day")) {
    classes.push(MONTH_PICKER_IN_VIEW_END_CLASS);
  }

  return classes.join(" ");
}

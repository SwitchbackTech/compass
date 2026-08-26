import { type Dayjs } from "@core/util/date/dayjs";

export const MONTH_PICKER_IN_VIEW_CLASS = "react-datepicker__day--in-view";

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

  if (date.isBetween(viewStart, viewEnd, "day", "[]")) {
    classes.push(MONTH_PICKER_IN_VIEW_CLASS);
  }

  return classes.join(" ");
}

import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

interface Params_GetDraggedEventDateRange {
  eventStart: Dayjs;
  durationMin: number;
  isAllDay: boolean;
}

export const getDraggedEventDateRange = ({
  eventStart,
  durationMin,
  isAllDay,
}: Params_GetDraggedEventDateRange) => {
  let adjustedStart = eventStart;
  let adjustedEnd = eventStart.add(durationMin, "minutes");

  if (!isAllDay && adjustedEnd.date() !== adjustedStart.date()) {
    adjustedEnd = adjustedEnd.hour(0).minute(0);
    adjustedStart = adjustedEnd.subtract(durationMin, "minutes");
  }

  return {
    startDate: isAllDay
      ? adjustedStart.format(YEAR_MONTH_DAY_FORMAT)
      : adjustedStart.format(),
    endDate: isAllDay
      ? adjustedEnd.format(YEAR_MONTH_DAY_FORMAT)
      : adjustedEnd.format(),
  };
};

interface Params_GetIsValidResizeMovement {
  currTime: Dayjs;
  draftStartDate: string;
  currentValue?: string;
  dateBeingChanged: "startDate" | "endDate" | null;
  isAllDay: boolean;
}

export const getIsValidResizeMovement = ({
  currTime,
  draftStartDate,
  currentValue,
  dateBeingChanged,
  isAllDay,
}: Params_GetIsValidResizeMovement) => {
  if (!dateBeingChanged) return false;
  if (isAllDay) return true;

  const formatted = currTime.format();
  if (currentValue === formatted) return false;

  const isDifferentDay = currTime.day() !== dayjs(draftStartDate).day();
  if (isDifferentDay) return false;

  return formatted !== draftStartDate;
};

import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

type DateRange = {
  endDate: string;
  startDate: string;
};

interface Params_GetDraggedEventDateRange {
  durationMin: number;
  eventStart: Dayjs;
  isAllDay: boolean;
}

export const getDraggedEventDateRange = ({
  durationMin,
  eventStart,
  isAllDay,
}: Params_GetDraggedEventDateRange): DateRange => {
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
  currentValue?: string;
  currTime: Dayjs;
  dateBeingChanged: "endDate" | "startDate" | null;
  draftStartDate: string;
  isAllDay: boolean;
}

export const getIsValidResizeMovement = ({
  currentValue,
  currTime,
  dateBeingChanged,
  draftStartDate,
  isAllDay,
}: Params_GetIsValidResizeMovement): boolean => {
  if (!dateBeingChanged) return false;

  if (isAllDay) {
    return true;
  }

  const formattedCurrTime = currTime.format();

  if (currentValue === formattedCurrTime) return false;

  if (currTime.day() !== dayjs(draftStartDate).day()) return false;

  return formattedCurrTime !== draftStartDate;
};

import { type MutableRefObject } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarDateCalcs } from "@web/common/calendar-grid/hooks/useCalendarDateCalcs";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";

export const useDateCalcs = (
  measurements: Measurements_Grid,
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
  weekDays: Dayjs[],
) => {
  const calendarDateCalcs = useCalendarDateCalcs(
    measurements,
    mainGridRef,
    weekDays.map((date) => ({
      date,
      key: date.format(YEAR_MONTH_DAY_FORMAT),
    })),
  );

  const getDateByXY = (x: number, y: number, _firstDayInView: Dayjs) => {
    return calendarDateCalcs.getDateByXY(x, y);
  };

  const getDateStrByXY = (
    x: number,
    y: number,
    _firstDayInView: Dayjs,
    format?: string,
  ) => {
    return calendarDateCalcs.getDateStrByXY(x, y, format);
  };

  const getDayNumberByX = (x: number) => {
    let dayNumber = 0;
    const totalWidth = measurements.colWidths.reduce((prev, width, index) => {
      if (x >= prev && x < prev + width) {
        dayNumber = index;
      }

      return prev + width;
    }, 0);

    if (x >= totalWidth) {
      dayNumber = measurements.colWidths.length - 1;
    }

    return dayNumber;
  };

  return {
    getDateByXY,
    getDateStrByXY,
    getDayNumberByX,
    getMinuteByY: calendarDateCalcs.getMinuteByY,
    getYByDate: calendarDateCalcs.getYByDate,
  };
};

export type DateCalcs = ReturnType<typeof useDateCalcs>;

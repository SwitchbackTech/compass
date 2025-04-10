import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { MutableRefObject } from "react";
import { HOURS_AM_FORMAT } from "@core/constants/date.constants";
import { ACCEPTED_TIMES } from "@web/common/constants/web.constants";
import { roundToPrev } from "@web/common/utils";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import { GRID_X_START } from "@web/views/Calendar/layout.constants";

dayjs.extend(weekPlugin);
dayjs.extend(utc);
dayjs.extend(timezone);

export const useDateCalcs = (
  measurements: Measurements_Grid,
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
) => {
  const getDateByX = (x: number, firstDayInView: Dayjs) => {
    const gridX = x - GRID_X_START;
    const dayIndex = getDayNumberByX(gridX);
    const date = firstDayInView.add(dayIndex, "day");

    return date;
  };

  const getDateByXY = (x: number, y: number, firstDayInView: Dayjs) => {
    let date = getDateByX(x, firstDayInView);

    const minutes = getMinuteByY(y);
    date = date.add(minutes, "minutes");

    return date;
  };

  const getDateStrByXY = (
    x: number,
    y: number,
    firstDayInView: Dayjs,
    format?: string,
  ) => {
    const date = getDateByXY(x, y, firstDayInView);

    if (format) {
      return date.format(format);
    }
    return date.format();
  };

  const getDayNumberByX = (x: number) => {
    let dayNumber = 0;
    measurements.colWidths.reduce((prev, width, index) => {
      if (x >= prev && x < prev + width) {
        dayNumber = index;
      }

      return prev + width;
    }, 0);

    return dayNumber;
  };

  const getMinuteByY = (y: number) => {
    if (!measurements.mainGrid) return 0; // TS guard. This should never happen

    const scrollTop = mainGridRef.current?.scrollTop || 0;
    // gridY is the distance from the top of the grid (main grid) to the click
    const gridY = y - measurements.mainGrid.top + scrollTop;

    const decimalMinute = (gridY / measurements.hourHeight) * 60;

    const flooredMinute = roundToPrev(decimalMinute, GRID_TIME_STEP);

    const finalMinute = Math.max(0, flooredMinute); // prevents negative number when clicking all-day row

    return finalMinute;
  };

  const getYByDate = (date: string) => {
    const day = dayjs(date);
    const startTime = ACCEPTED_TIMES.indexOf(day.format(HOURS_AM_FORMAT)) / 4;

    return measurements.hourHeight * startTime;
  };

  return {
    getDateByXY,
    getDayNumberByX,
    getDateStrByXY,
    getMinuteByY,
    getYByDate,
  };
};

export type DateCalcs = ReturnType<typeof useDateCalcs>;

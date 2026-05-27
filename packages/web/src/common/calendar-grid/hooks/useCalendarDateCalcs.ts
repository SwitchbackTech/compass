import { type MutableRefObject } from "react";
import { HOURS_AM_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import {
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_GRID_TIME_STEP,
} from "@web/common/calendar-grid/calendarGrid.constants";
import {
  type CalendarGridMeasurements,
  type CalendarGridVisibleDate,
} from "@web/common/calendar-grid/types/calendarGrid.types";
import { ACCEPTED_TIMES } from "@web/common/constants/web.constants";
import { roundToPrev } from "@web/common/utils/round/round.util";

export const useCalendarDateCalcs = (
  measurements: CalendarGridMeasurements,
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
  visibleDates: CalendarGridVisibleDate[],
) => {
  const getVisibleDateIndexByX = (x: number) => {
    const gridLeft =
      mainGridRef.current?.getBoundingClientRect().left ??
      measurements.mainGrid?.left ??
      0;
    const gridX = Math.max(0, x - gridLeft - CALENDAR_GRID_MARGIN_LEFT);
    let dateIndex = 0;
    const totalWidth = measurements.colWidths.reduce((left, width, index) => {
      if (gridX >= left && gridX < left + width) {
        dateIndex = index;
      }
      return left + width;
    }, 0);

    if (gridX >= totalWidth) {
      dateIndex = visibleDates.length - 1;
    }

    return Math.max(0, Math.min(dateIndex, visibleDates.length - 1));
  };

  const getMinuteByY = (y: number) => {
    if (!measurements.mainGrid) return 0;

    const scrollTop = mainGridRef.current?.scrollTop || 0;
    const gridY = y - measurements.mainGrid.top + scrollTop;
    const decimalMinute = (gridY / measurements.hourHeight) * 60;
    const flooredMinute = roundToPrev(decimalMinute, CALENDAR_GRID_TIME_STEP);

    return Math.max(0, flooredMinute);
  };

  const getDateByXY = (x: number, y: number) => {
    const visibleDate = visibleDates[getVisibleDateIndexByX(x)]?.date;

    return (visibleDate ?? dayjs()).add(getMinuteByY(y), "minutes");
  };

  const getDateStrByXY = (x: number, y: number, format?: string) => {
    const date = getDateByXY(x, y);

    if (format) {
      return date.format(format);
    }
    return date.format();
  };

  const getYByDate = (date: string) => {
    const day = dayjs(date);
    const startTime = ACCEPTED_TIMES.indexOf(day.format(HOURS_AM_FORMAT)) / 4;

    return measurements.hourHeight * startTime;
  };

  return {
    getDateByXY,
    getDateStrByXY,
    getMinuteByY,
    getVisibleDateIndexByX,
    getYByDate,
  };
};

export type CalendarDateCalcs = ReturnType<typeof useCalendarDateCalcs>;

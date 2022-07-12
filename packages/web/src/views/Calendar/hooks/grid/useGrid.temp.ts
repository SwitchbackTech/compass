import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import weekPlugin from "dayjs/plugin/weekOfYear";
import {
  HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
import { roundToNext } from "@web/common/utils";
import { GRID_TIME_STEP } from "@web/common/constants/grid.constants";

import { GRID_X_START, GRID_Y_START } from "../../layout.constants";
import useHeight from "./useHeight";

dayjs.extend(weekPlugin);
dayjs.extend(utc);
dayjs.extend(timezone);

export const useGridTemp = () => {
  const _getEventsGridRef = () => {
    console.log("making new ref");
    return useRef<HTMLDivElement>(null);
  };

  const [gridXOffset, setGridXOffset] = useState(0);
  const [gridYOffset, setGridYOffset] = useState(0);
  // const [hourlyCellHeight, setHourlyCellHeight] = useState(0);

  console.log("useGrid");
  const allDayEventsGridRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  // const eventsGridRef = useRef<HTMLDivElement>(null);
  const eventsGridRef = _getEventsGridRef();
  const weekDaysRef = useRef<HTMLDivElement>(null);

  const hourlyCellHeight = useHeight(eventsGridRef);
  // console.log("hourlyCellHeight:", hourlyCellHeight);
  // console.log("cell height:", hourlyCellHeight);

  useEffect(() => {
    const widths = Array.from(weekDaysRef.current?.children || []).map(
      (e) => e.clientWidth
    );

    setColumnWidths(widths);
    // }, [week, weekDaysRef.current?.clientWidth]);
  }, [weekDaysRef.current?.clientWidth]);

  useEffect(() => {
    // reminder: runs after toggling side bar toggled,
    // but not when resizing window
    const xOffset = GRID_X_START + (calendarRef.current?.offsetLeft || 0);
    // console.log("setting xOffset to:", xOffset);
    setGridXOffset(xOffset);
  }, [calendarRef.current?.offsetLeft]);

  useEffect(() => {
    const yOffset =
      GRID_Y_START + (allDayEventsGridRef.current?.clientHeight || 0);
    setGridYOffset(yOffset);
    // }, [allDayEventsGridRef.current?.clientHeight, rowsCount]);
  }, [allDayEventsGridRef.current?.clientHeight]);

  const getColumnWidth = (dayIndex: number) => columnWidths[dayIndex];

  const getDateByX = (x: number) => {
    const clickX = x - gridXOffset;
    const dayIndex = getDayNumberByX(clickX);
    // console.log(`
    // gridXOffset (${gridXOffset}) =
    //   CALENDAR_X_START (${CALENDAR_X_START}) +
    //   (calendarRef.current?.offsetLeft || 0) ${
    //     calendarRef.current?.offsetLeft || 0
    //   } // ++

    // clickX (${clickX}) = x (${x}) - gridXOffset (${gridXOffset})
    // ----
    // console.log(`x (${x}) =  ${dayIndex}`); //++
    // console.log(`scrollTop: ${scrollTop}`);

    // const date = startOfSelectedWeekDay.add(dayIndex, "day");

    // return date;
    return dayjs();
  };

  const getDateByXY = (x: number, y: number) => {
    let date = getDateByX(x);

    const isOverAllDayRow = y < gridYOffset;
    console.log(`allDay: ${isOverAllDayRow.toString()} (${y}, ${gridYOffset})`);
    const clickY = y - gridYOffset;
    const minutes = getMinuteByY(clickY);
    date = date.add(minutes, "minutes");

    return date;
  };

  const getDateStrByXY = (x: number, y: number) => {
    const date = getDateByXY(x, y);

    // $$ try using a TZ offset format (like the default .format())
    // the frontend is currently trusted to pass it to backend
    // in TZ format, so better to keep it like that
    return date.format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);
  };

  const getDayNumberByX = (x: number) => {
    let dayNumber = 0;
    columnWidths.reduce((prev, width, index) => {
      if (x >= prev && x < prev + width) {
        dayNumber = index;
      }

      return prev + width;
    }, 0);

    // console.log(`
    // day: ${dayNumber}
    // cols: ${columnWidths.toString()}
    // `);
    return dayNumber;
  };

  const getMinuteByY = (y: number) => {
    if (eventsGridRef.current?.scrollTop === 0) {
      console.log("hmm, no scroll, handle...");
      return 0;
    }
    const absoluteY = y + eventsGridRef.current?.scrollTop;
    const hourOfDay = absoluteY / hourlyCellHeight;
    const minuteOfDay = Math.round(hourOfDay * 60);

    const roundedMinuteOfDay = roundToNext(
      minuteOfDay - GRID_TIME_STEP / 2,
      GRID_TIME_STEP
    );

    // console.log("minute:", Math.max(0, minute));
    // prevents negative number when clicking all-day row
    // return Math.max(0, minute);
    //y 160, 0, 0
    // scroll top and hourly cell height are 0,
    // dividing by 0 === Infinity
    if (roundedMinuteOfDay === Infinity) {
      console.log(eventsGridRef.current);
      console.log(`oops, Infinity
      scrollTop: ${eventsGridRef.current?.scrollTop}
      hourlyCellHeight: ${hourlyCellHeight}
      minute: ${minuteOfDay}
      `);
    }
    return roundedMinuteOfDay;
  };

  const getYByDate = (date: string) => {
    const day = dayjs(date);
    const startTime = TIME_LABELS.indexOf(day.format(HOURS_AM_FORMAT)) / 4;

    return hourlyCellHeight * startTime;
  };

  return {
    eventHandlers: {},
    component: {
      allDayEventsGridRef,
      calendarRef,
      eventsGridRef,
      gridXOffset,
      gridYOffset,
      hourlyCellHeight,
      weekDaysRef,
    },
    core: {
      getColumnWidth,
      getDateByXY,
      getDayNumberByX,
      getMinuteByY,
    },
  };
};

export type GridPropsTemp = ReturnType<typeof useGridTemp>;

import { MouseEvent } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { roundToNext } from "@web/common/utils";
import { getElemById, getX } from "@web/common/utils/grid.util";
import {
  DRAFT_DURATION_MIN,
  GRID_TIME_STEP,
  GRID_Y_START,
  SIDEBAR_X_START,
} from "@web/views/Calendar/layout.constants";
import { Categories_Event } from "@core/types/event.types";
import { assembleDefaultEvent } from "@web/common/utils/event.util";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getMousePosition } from "../position/mouse.position";

export const assembleTimedDraft = async (
  e: MouseEvent,
  dateCalcs: DateCalcs,
  isSidebarOpen: boolean,
  startOfView: Dayjs
): Promise<Schema_GridEvent> => {
  const x = getX(e, isSidebarOpen);
  const _start = dateCalcs.getDateByXY(x, e.clientY, startOfView);
  const startDate = _start.format();
  const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();

  const event = (await assembleDefaultEvent(
    Categories_Event.TIMED,
    startDate,
    endDate
  )) as Schema_GridEvent;
  return event;
};

export const getDraftTimes = (isCurrentWeek: boolean, startOfWeek: Dayjs) => {
  const currentMinute = dayjs().minute();
  const nextMinuteInterval = roundToNext(currentMinute, GRID_TIME_STEP);

  const fullStart = isCurrentWeek ? dayjs() : startOfWeek.hour(dayjs().hour());
  const _start = fullStart.minute(nextMinuteInterval).second(0);

  const _end = _start.add(1, "hour");
  const startDate = _start.format();
  const endDate = _end.format();

  return { startDate, endDate };
};

export const getDraftContainer = (isAllDay: boolean) => {
  if (isAllDay) {
    return getElemById(ID_GRID_ALLDAY_ROW);
  }

  return getElemById(ID_GRID_EVENTS_TIMED);
};

export const isOverMainGrid = (
  x: number,
  y: number,
  allDayRow: DOMRect | null
) => {
  if (!allDayRow?.bottom || !allDayRow?.top) {
    throw Error("Missing measurements for all-day row");
    return false;
  }

  const { isOverMainGrid } = getMousePosition(
    {
      allDayRowBottom: allDayRow.bottom,
      allDayRowTop: allDayRow.top,
      gridYStart: GRID_Y_START,
      sidebarXStart: SIDEBAR_X_START,
    },
    {
      x,
      y,
    }
  );

  return isOverMainGrid;
};

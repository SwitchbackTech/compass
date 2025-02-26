import dayjs, { Dayjs } from "dayjs";
import { MouseEvent } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
  ID_SIDEBAR,
} from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { roundToNext } from "@web/common/utils";
import { assembleDefaultEvent } from "@web/common/utils/event.util";
import { getElemById, getX } from "@web/common/utils/grid.util";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  DRAFT_DURATION_MIN,
  GRID_TIME_STEP,
} from "@web/views/Calendar/layout.constants";

export const assembleAlldayDraft = async (
  e: MouseEvent,
  dateCalcs: DateCalcs,
  isSidebarOpen: boolean,
  startOfView: Dayjs,
): Promise<Schema_GridEvent> => {
  const x = getX(e, isSidebarOpen);
  const _start = dateCalcs.getDateByXY(x, e.clientY, startOfView);
  const startDate = _start.format();
  const endDate = _start.add(1, "day").format();

  const event = (await assembleDefaultEvent(
    Categories_Event.ALLDAY,
    startDate,
    endDate,
  )) as Schema_GridEvent;
  return event;
};

export const assembleTimedDraft = async (
  e: MouseEvent,
  dateCalcs: DateCalcs,
  isSidebarOpen: boolean,
  startOfView: Dayjs,
): Promise<Schema_GridEvent> => {
  const x = getX(e, isSidebarOpen);
  const _start = dateCalcs.getDateByXY(x, e.clientY, startOfView);
  const startDate = _start.format();
  const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();

  const event = (await assembleDefaultEvent(
    Categories_Event.TIMED,
    startDate,
    endDate,
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

export const getDraftContainer = (category: Categories_Event) => {
  switch (category) {
    case Categories_Event.ALLDAY:
      return getElemById(ID_GRID_EVENTS_ALLDAY);
    case Categories_Event.TIMED:
      return getElemById(ID_GRID_EVENTS_TIMED);
  }
};

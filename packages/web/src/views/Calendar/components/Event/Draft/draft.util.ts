import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { roundToNext } from "@web/common/utils";
import { getElemById } from "@web/common/utils/grid.util";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import dayjs, { Dayjs } from "dayjs";

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
    return getElemById(ID_GRID_EVENTS_ALLDAY);
  }

  return getElemById(ID_GRID_EVENTS_TIMED);
};

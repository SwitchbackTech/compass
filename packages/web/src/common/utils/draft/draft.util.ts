import { Categories_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { getElemById } from "@web/common/utils/grid/grid.util";
import { roundToNext } from "@web/common/utils/round/round.util";
import {
  type Activity_DraftEvent,
  draftActions,
} from "@web/events/stores/draft.store";
import { GRID_TIME_STEP } from "@web/views/Week/layout.constants";

export const createTimedDraft = async (
  isCurrentWeek: boolean,
  startOfView: Dayjs,
  activity: Activity_DraftEvent,
) => {
  const { startDate, endDate } = getDraftTimes(isCurrentWeek, startOfView);

  const event = (await assembleDefaultEvent(
    Categories_Event.TIMED,
    startDate,
    endDate,
  )) as Schema_GridEvent;

  draftActions.start({
    activity,
    eventType: Categories_Event.TIMED,
    event,
  });
};

export const createAlldayDraft = async (
  startOfView: Dayjs,
  endOfView: Dayjs,
  activity: Activity_DraftEvent,
) => {
  const today = dayjs();
  const start = today.isBetween(startOfView, endOfView, "day", "[]")
    ? today.startOf("day")
    : startOfView.startOf("day");
  const startDate = start.format();
  const endDate = start.add(1, "day").format();

  const event = (await assembleDefaultEvent(
    Categories_Event.ALLDAY,
    startDate,
    endDate,
  )) as Schema_GridEvent;

  draftActions.start({
    activity,
    eventType: Categories_Event.ALLDAY,
    event,
  });
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

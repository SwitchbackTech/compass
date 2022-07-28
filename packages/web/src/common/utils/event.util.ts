import { schema } from "normalizr";
import { v4 as uuidv4 } from "uuid";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import {
  YEAR_MONTH_DAY_COMPACT_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
} from "@web/common/constants/dates";
import {
  Categories_Event,
  Params_Events,
  Schema_Event,
} from "@core/types/event.types";
import { Priorities } from "@core/constants/core.constants";

import { Schema_GridEvent } from "../types/web.event.types";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export const getDefaultEvent = (
  draftType: Categories_Event,
  startDate?: string,
  endDate?: string
): Schema_GridEvent | null => {
  switch (draftType) {
    case Categories_Event.ALLDAY:
      return {
        isAllDay: true,
        isSomeday: false,
        priority: Priorities.UNASSIGNED,
        startDate,
        endDate: dayjs(startDate).add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
      };
    case Categories_Event.SOMEDAY:
      return {
        isAllDay: false,
        isSomeday: true,
        priority: Priorities.UNASSIGNED,
      };
    case Categories_Event.TIMED: {
      return {
        isAllDay: false,
        isSomeday: false,
        isTimesShown: true,
        priority: Priorities.UNASSIGNED,
        startDate,
        endDate,
      };
    }
    default:
      return null;
  }
};

// rudimentary handling of errors
// meant for temporary testing, will be replaced
export const handleErrorTemp = (error: Error) => {
  if (error.message.slice(-3) === "401") {
    // SuperTokensWrapper will handle these
    return;
  }
  alert(error);
  console.log(error);
};

export const getWeekDayLabel = (day: Dayjs | Date) => {
  if (day instanceof Date) {
    return dayjs(day).format(YEAR_MONTH_DAY_COMPACT_FORMAT);
  }
  return day.format(YEAR_MONTH_DAY_COMPACT_FORMAT);
};

/*
-------------------------------------------------------------------------------
Demo of using pagination and group ordering. 
Keep until implementing for the Someday List and 
ordering group events
*/
export const _readEventsFromStorage = (): Schema_Event[] =>
  (JSON.parse(localStorage.getItem("events") || "[]") as Schema_Event[]) || [];

export const doEventsIntercept = (
  event1: Schema_Event,
  event2: Schema_Event
) => {
  //refactor to just is 'isBetween'?
  const firstDotIntercepts = dayjs(event1.startDate).isBefore(event2.endDate);
  const secondDotIntercepts = dayjs(event1.endDate).isAfter(event2.startDate);

  return firstDotIntercepts && secondDotIntercepts;
};

export const normalizedEventsSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

export const getEventsLocalStorage = async (params: Params_Events = {}) => {
  const {
    startDate,
    endDate,
    page: _page = 1,
    offset,
    pageSize = 0,
    priorities = [Priorities.RELATIONS, Priorities.SELF, Priorities.WORK],
  } = params || {};
  const page = _page || 1;

  const events = _readEventsFromStorage();

  const startIndex = offset !== undefined ? offset : (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const eventsFilteredData = events.filter((event) => {
    const isAfterStartDate = dayjs(event.startDate).isSameOrAfter(startDate);
    const isBeforeEndDate = dayjs(event.startDate).isSameOrBefore(endDate);

    if (startDate && endDate) {
      return isAfterStartDate && isBeforeEndDate;
    }

    if (startDate) {
      return isAfterStartDate;
    }

    if (endDate) {
      return isBeforeEndDate;
    }

    return true;
  });

  let eventsData = eventsFilteredData
    .filter((event) => priorities.includes(event.priority))
    .slice(startIndex, endIndex || undefined)
    .sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return dayjs(a.startDate).toDate() - dayjs(b.startDate).toDate();
    });

  let groups: Schema_Event[][] = [];
  let groupIndex = 0;

  if (eventsData.length) {
    eventsData.forEach((event, index) => {
      if (index === 0) return;

      const prevValue = eventsData[index - 1];
      if (doEventsIntercept(prevValue, event)) {
        if (!groups[groupIndex]) {
          groups[groupIndex] = [prevValue, event];

          return;
        }

        groups[groupIndex].push(event);

        return;
      }

      groupIndex += 1;
    });
  }

  groups.forEach((group) => {
    group.sort((a, b) => {
      if (dayjs(b.startDate).isBefore(a.startDate)) {
        return 1;
      }

      if (dayjs(b.endDate).isAfter(a.endDate)) {
        return 0;
      }

      return -1;
    });
  });

  groups = groups.filter((group) => group.length);

  eventsData = eventsData
    .map((event) => {
      let rowCount = 0;
      let rowOrder = 0;

      if (event.allDay) return event;

      groups.find((group) => {
        rowOrder = group.findIndex(
          (groupEvent) => groupEvent._id === event._id
        );
        if (rowOrder === -1) return false;

        rowOrder += 1;

        rowCount = rowOrder && group.length;
        return true;
      });

      return { ...event, rowOrder, rowCount };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return {
    data: eventsData,
    page,
    pageSize,
    count: eventsFilteredData.length,
    startDate,
    endDate,
  };
};

export const createEventLocalStorage = async (event: Schema_Event) => {
  const events = await getEventsLocalStorage();
  const id = uuidv4();
  localStorage.setItem(
    "events",
    JSON.stringify([
      ...events.data,
      { ...event, id, order: event.order || events.data.length },
    ])
  );
};

export const editEventLocalStorage = async (
  id: string,
  event: Schema_Event
) => {
  const eventsResponse = await getEventsLocalStorage();

  const events = eventsResponse.data
    .map((storageEvent) => {
      if (storageEvent._id === id) return event;

      return { ...storageEvent, order: (storageEvent.order || 0) + 0.5 };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((storageEvent, order) => ({ ...storageEvent, order }));

  localStorage.setItem("events", JSON.stringify(events));
};

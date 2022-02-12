import dayjs from "dayjs";
import { schema } from "normalizr";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { v4 as uuidv4 } from "uuid";

import { Params_Events, Schema_Event } from "@core/types/event.types";
import { Priorities } from "@core/core.constants";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// rudimentary handling of errors
// meant for temporary testing, will be replaced
export const handleErrorTemp = (error: Error) => {
  console.log(error);
  alert(error);
};

export const getAllDayCountsMap = (allDayEvents: Schema_Event[]) => {
  const allDayCountByDate: { [key: string]: number } = {};
  const foo = allDayEvents.map((e) => {
    if (!e.startDate) return;
    allDayCountByDate[e.startDate] = e.allDayOrder || 1;
  });
  return foo;
};

export const getAllDayCounts = (allDayEvents: Schema_Event[]) => {
  const allDayCountByDate: { [key: string]: number } = {};
  allDayEvents.forEach((event: Schema_Event) => {
    if (!event.startDate) return;
    allDayCountByDate[event.startDate] = event.allDayOrder || 1;
  });

  return allDayCountByDate;
};

export const orderEvents = (events: Schema_Event[]) => {
  // set default for days that dont have overlapping events
  const updatedEvents = events.map((e) => ({ ...e, allDayOrder: 1 }));

  const uniqueStartDates = Array.from(
    new Set(updatedEvents.map((e) => e.startDate))
  );

  uniqueStartDates.forEach((startDate) => {
    const eventsOnDay = updatedEvents.filter((e) => e.startDate === startDate);
    if (eventsOnDay.length > 1) {
      // sort in descending order (c, b, a)
      const sortedEventsOnDay = eventsOnDay.sort(
        (a: Schema_Event, b: Schema_Event) =>
          b.title.toLowerCase().localeCompare(a.title.toLowerCase())
      );

      sortedEventsOnDay.map((e, index) => {
        // calculate the order
        e.allDayOrder += index;

        // find & replace matching element so it has the updated allDayOrder
        const i = updatedEvents.findIndex((event) => event._id === e._id);
        updatedEvents[i] = e;
      });
    }
  });

  return updatedEvents;
};

/*
Demo of using pagination and group ordering. 
Keep until implementing for the Someday List and 
ordering group events
*/
export const _readEventsFromStorage = (): Schema_Event[] =>
  (JSON.parse(localStorage.getItem("events") || "[]") as Schema_Event[]) || [];

const doEventsIntercept = (event1: Schema_Event, event2: Schema_Event) => {
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
      let groupCount = 0;
      let groupOrder = 0;

      if (event.allDay) return event;

      groups.find((group) => {
        groupOrder = group.findIndex(
          (groupEvent) => groupEvent._id === event._id
        );
        if (groupOrder === -1) return false;

        groupOrder += 1;

        groupCount = groupOrder && group.length;
        return true;
      });

      return { ...event, groupOrder, groupCount };
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
  console.log(`editing evt: ${id}`);
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

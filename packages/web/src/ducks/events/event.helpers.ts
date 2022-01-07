import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { v4 as uuidv4 } from "uuid";

import { Params_Events_Wip, Schema_Event_Wip } from "@core/types/event.types";
// jest had trouble resolving with @core/..., so using long path for now
import { Priorities } from "../../../../core/src/core.constants";

import { EventApi } from "@web/ducks/events/api";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const doEventsIntercept = (
  event1: Schema_Event_Wip,
  event2: Schema_Event_Wip
) => {
  const firstDotIntercepts = dayjs(event1.startDate).isBefore(event2.endDate);
  const secondDotIntercepts = dayjs(event1.endDate).isAfter(event2.startDate);

  return firstDotIntercepts && secondDotIntercepts;
};

export const _readEventsFromStorage = (): Schema_Event_Wip[] =>
  (JSON.parse(localStorage.getItem("events") || "[]") as Schema_Event_Wip[]) ||
  [];

/*
TODO: (needed to be done on API side) sortings corner cases:
a) All day events sortings: just implement same logic
as it is done for plain events sorting

b) Plain events:
1) We create groups of events which intersects with each other
2) We check every event if it is in group of intersecting events
3) if yes - add order which is index in group array and count of
group events (which is length of current group)

TODO: when setting groupCount in event - check
if event intercepts with any of events from other groups
*/
export const getEventsLocalStorage = async (params: Params_Events_Wip = {}) => {
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
  console.log("reminder: using local strg evts, not from server");
  // const events = await EventApi.getEvts(params);

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

  let groups: Schema_Event_Wip[][] = [];
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
          (groupEvent) => groupEvent.id === event.id
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

export const createEventLocalStorage = async (event: Schema_Event_Wip) => {
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

export const editEventOld = async (id: string, event: Schema_Event_Wip) => {
  console.log("editing evt old version");
  const eventsResponse = await getEventsLocalStorage();

  const events = eventsResponse.data
    .map((storageEvent) => {
      if (storageEvent.id === id) return event;

      return { ...storageEvent, order: (storageEvent.order || 0) + 0.5 };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((storageEvent, order) => ({ ...storageEvent, order }));

  localStorage.setItem("events", JSON.stringify(events));
};

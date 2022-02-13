import { Schema_Event } from "@core/types/event.types";
import { isAllDay } from "@core/util/event.util";

import { isProcessing, isSuccess } from "@web/common/store/helpers";
import { RootState } from "@web/store";
import { orderEvents } from "./event.helpers";

import { SectionType } from "./types";

export const selectAreEventsProcessingBySectionType = (
  state: RootState,
  type: SectionType
) => {
  const statePieceName = type.charAt(0).toUpperCase() + type.slice(1);
  const statePiece =
    state.events[`get${statePieceName}Events` as "getWeekEvents"];

  return isProcessing(statePiece);
};

export const selectEventEntities = (state: RootState) =>
  state.events.entities.value || {};

export const selectEventIdsBySectionType = (
  state: RootState,
  type: SectionType
) => (selectPaginatedEventsBySectionType(state, type) || {}).data || [];

export const selectEventById = (state: RootState, id: string): Schema_Event =>
  selectEventEntities(state)[id] || {};

export const selectIsCreateEventProcessing = (state: RootState) =>
  isProcessing(state.events.createEvent);

export const selectIsEditEventProcessing = (state: RootState) =>
  isProcessing(state.events.editEvent);

export const selectPaginatedEventsBySectionType = (
  state: RootState,
  type: SectionType
) => {
  const statePieceName = type.charAt(0).toUpperCase() + type.slice(1);
  const statePiece =
    state.events[`get${statePieceName}Events` as "getWeekEvents"];

  return (isSuccess(statePiece) && statePiece.value) || null;
};

/******
 * Wip
 *******/
export const selectWipWeekEvents = (state: RootState) => {
  const eventEntities = selectEventEntities(state);
  const weekEventIds = selectEventIdsBySectionType(state, "week");
  const weekEventsMapped = weekEventIds.map(
    (_id: string) => eventEntities[_id]
  );
  const weekEvents = weekEventsMapped.filter((e: Schema_Event) => !e.isAllDay);
  return weekEvents;
};

export const selectWip = (state: RootState) => {
  const { allDayEvents } = selectWipCategorizedEvents(state, "week");
  const allDayCountByDate: { [key: string]: number } = {};
  // console.log(allDayEvents);
  // allDayEvents.forEach((event: Schema_Event) => {
  // if (!event.startDate) return;
  // allDayCountByDate[event.startDate] = event.allDayOrder || 1;
  // });
  return allDayCountByDate;
};

export const selectWipCategorizedEvents = (
  state: RootState,
  sectionType: SectionType
) => {
  const eventEntities = selectEventEntities(state);
  const weekEventIds = selectEventIdsBySectionType(state, sectionType);
  const weekEventsMapped = weekEventIds.map(
    (_id: string) => eventEntities[_id]
  );
  const weekEvents = weekEventsMapped.filter((e: Schema_Event) => {
    if (e !== undefined) {
      return !e.isAllDay;
    } else {
      return false;
    }
  });

  const _allDayEvents = weekEventsMapped.filter(
    (e: Schema_Event) => e.isAllDay
  );
  // console.log("alldayev:", _allDayEvents);
  // $$ re-enable one sure its not causing issues
  // const allDayEvents = orderEvents(_allDayEvents);
  const allDayEvents = _allDayEvents;

  // $$ testing
  // shouldnt be in the selector, cuz its modifying state
  // (even if state isnt clearly defined via slice like the other stuff)
  // const allDayCountByDate: { [key: string]: number } = {};
  // allDayEvents.forEach((event: Schema_Event) => {
  // if (!event.startDate) return;
  // allDayCountByDate[event.startDate] = event.allDayOrder || 1;
  // });

  return { weekEvents, allDayEvents };
};

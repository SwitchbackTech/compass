import { createSelector } from "@reduxjs/toolkit";
import { Schema_Event } from "@core/types/event.types";
import { isProcessing, isSuccess } from "@web/common/store/helpers";
import { RootState } from "@web/store";
import { assignEventsToRow } from "@web/common/utils/grid.util";

import { SectionType } from "./types";

export const selectAllDayEvents = (state: RootState) => {
  const entities = state.events.entities.value || {};
  const weekIds = state.events.getWeekEvents.value || [];
  if (!weekIds.data || weekIds.data.length === 0) return [];
  const weekEventsMapped: Schema_Event[] = weekIds.data.map(
    (_id: string) => entities[_id]
  );

  const _allDayEvents = weekEventsMapped.filter(
    (e: Schema_Event) => e !== undefined && e.isAllDay
  );

  const { allDayEvents } = assignEventsToRow(_allDayEvents);
  return allDayEvents;
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

export const selectWeekEvents = (state: RootState): Schema_Event[] => {
  const entities = state.events.entities.value || {};
  const weekIds = state.events.getWeekEvents.value || [];
  if (!weekIds.data || weekIds.data.length === 0) return [];
  const weekEventsMapped = weekIds.data.map((_id: string) => entities[_id]);

  const weekEvents = weekEventsMapped.filter(
    (e: Schema_Event) => e !== undefined && !e.isAllDay
  );
  return weekEvents;
};

/*********************
 * Memoized Selectors
 *    ... that aren't being allowed to
 *        memoized correctly
 *        due to how many dependencies
 *        are currently in useGetWeekViewProps
 * 
 * How to use:
    const s = store.getState();
    const allDayEvents = selectAllDayEventsMemo(s);
    const weekEvents = selectWeekEventsMemo(s);
 * ^ Using this way is really slow for some reason
 *********************/
const _selectWeekEntities = (state: RootState) => {
  if (state.events === undefined) return {};
  return state.events.entities.value;
};
const _selectWeekIds = (state: RootState) => {
  if (state.events === undefined) return [];
  return state.events.getWeekEvents.value;
};

export const selectAllDayEventsMemo = createSelector(
  _selectWeekIds,
  _selectWeekEntities,
  (weekIds, weekEntities) => {
    if (weekIds === null) return [];
    const weekEventsMapped = weekIds.data.map(
      (_id: string) => weekEntities[_id]
    );

    const _allDayEvents: Schema_Event[] = weekEventsMapped.filter(
      (e: Schema_Event) => e !== undefined && e.isAllDay
    );

    const { allDayEvents } = assignEventsToRow(_allDayEvents);
    return allDayEvents;
  }
);

export const selectWeekEventsMemo = createSelector(
  _selectWeekIds,
  _selectWeekEntities,
  (weekIds, weekEntities) => {
    if (weekIds === null) return [];
    const weekEventsMapped = weekIds.data.map(
      (_id: string) => weekEntities[_id]
    );
    const weekEvents = weekEventsMapped.filter(
      (e: Schema_Event) => e !== undefined && !e.isAllDay
    );
    return weekEvents;
  }
);

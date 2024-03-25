import { createSelector } from "@reduxjs/toolkit";
import { Schema_Event } from "@core/types/event.types";
import { RootState } from "@web/store";
import { assignEventsToRow } from "@web/common/utils/grid.util";

export const selectAllDayEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  (state: RootState) => state.events.getWeekEvents.value || [],
  (entities, weekIds) => {
    if (!("data" in weekIds) || weekIds.data.length === 0) return [];

    const weekEvents: Schema_Event[] = weekIds.data.map(
      (_id: string) => entities[_id]
    );
    const _allDayEvents: Schema_Event[] = weekEvents.filter(
      (e: Schema_Event) => e !== undefined && e.isAllDay
    );
    const { allDayEvents } = assignEventsToRow(_allDayEvents);
    return allDayEvents;
  }
);

export const selectEventById = (state: RootState, id: string): Schema_Event =>
  selectEventEntities(state)[id] || {};

export const selectEventEntities = (state: RootState) =>
  state.events.entities.value || {};

export const selectGridEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  (state: RootState) => state.events.getWeekEvents.value || [],
  (entities, weekIds) => {
    if (!("data" in weekIds) || weekIds.data.length === 0) return [];
    const weekEventsMapped = weekIds.data.map((_id: string) => entities[_id]);

    const weekEvents = weekEventsMapped.filter(
      (e: Schema_Event) => e !== undefined && !e.isAllDay
    );

    return weekEvents;
  }
);

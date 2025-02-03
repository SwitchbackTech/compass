import { createSelector } from "@reduxjs/toolkit";
import { Schema_Event } from "@core/types/event.types";
import { RootState } from "@web/store";
import { assignEventsToRow } from "@web/common/utils/grid.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event.util";

type Schema_GridEvent_NoPosition = Omit<Schema_GridEvent, "position">;

export const selectAllDayEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  (state: RootState) => state.events.getWeekEvents.value || [],
  (entities, weekIds) => {
    if (!("data" in weekIds) || weekIds.data.length === 0) return [];

    const weekEvents: Schema_GridEvent_NoPosition[] = weekIds.data.map(
      (_id: string) => entities[_id]
    );
    const _allDayEvents: Schema_GridEvent_NoPosition[] = weekEvents.filter(
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

    const weekEvents: Schema_GridEvent[] = weekEventsMapped
      .filter((e: Schema_Event) => e !== undefined && !e.isAllDay)
      .map(assembleGridEvent);

    return weekEvents;
  }
);

export const selectRowCount = createSelector(
  selectAllDayEvents,
  (allDayEvents: Schema_GridEvent[]) => {
    const _rowVals = allDayEvents.map((e) => e.row);
    const rowsCount = _rowVals.length === 0 ? 1 : Math.max(..._rowVals);
    return rowsCount;
  }
);

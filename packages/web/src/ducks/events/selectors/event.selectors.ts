import { createSelector } from "@reduxjs/toolkit";
import { Schema_Event } from "@core/types/event.types";
import { isProcessing } from "@web/common/store/helpers";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";
import { adjustOverlappingEvents } from "@web/common/utils/overlap/overlap";
import { RootState } from "@web/store";

type Schema_GridEvent_NoPosition = Omit<Schema_GridEvent, "position">;

export const selectAllDayEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  (state: RootState) => state.events.getWeekEvents.value || [],
  (entities, weekIds) => {
    if (!("data" in weekIds) || weekIds.data?.length === 0) return [];

    const weekEvents: Schema_GridEvent_NoPosition[] = weekIds.data?.map(
      (_id: string) => entities[_id],
    );
    const _allDayEvents: Schema_GridEvent_NoPosition[] = weekEvents?.filter(
      (e: Schema_Event) => e !== undefined && e.isAllDay,
    );
    const { allDayEvents } = assignEventsToRow(_allDayEvents);
    return allDayEvents;
  },
);

export const selectEventById = (
  state: RootState,
  id: string,
): Schema_Event | null => selectEventEntities(state)[id] ?? null;

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
  },
);

export const selectRowCount = createSelector(
  selectAllDayEvents,
  (allDayEvents: Schema_GridEvent[]) => {
    const _rowVals = allDayEvents?.map((e) => e.row);
    const rowsCount = (_rowVals ?? []).length === 0 ? 1 : Math.max(..._rowVals);
    return rowsCount;
  },
);

const selectDayEventIds = (state: RootState) => {
  const value = state.events.getDayEvents.value;

  if (!value || !("data" in value)) {
    return [];
  }

  return value.data ?? [];
};

export const selectDayEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  selectDayEventIds,
  (entities, ids) =>
    ids
      .map((id: string) => entities[id])
      .filter((event): event is Schema_Event => Boolean(event)),
);

export const selectIsDayEventsProcessing = (state: RootState) =>
  isProcessing(state.events.getDayEvents);

export const selectTimedDayEvents = createSelector(
  selectDayEvents,
  (events) => {
    const timedEvents: Schema_GridEvent[] = events
      .filter((event) => !event.isAllDay)
      .map(assembleGridEvent);

    return adjustOverlappingEvents(timedEvents);
  },
);

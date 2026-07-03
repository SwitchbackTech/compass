import { createSelector } from "@reduxjs/toolkit";
import { type Schema_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";
import { type Entities_Event } from "@web/ducks/events/event.types";
import { type RootState } from "@web/store";

type Schema_GridEvent_NoPosition = Omit<Schema_GridEvent, "position">;

const EMPTY_EVENT_ENTITIES: Entities_Event = {};
const EMPTY_EVENT_IDS: string[] = [];

export const selectEventEntities = (state: RootState) =>
  state.events.entities.value ?? EMPTY_EVENT_ENTITIES;

export const selectAllDayEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  (state: RootState) => state.events.getWeekEvents.value || [],
  (entities, weekIds) => {
    if (!("data" in weekIds) || weekIds.data?.length === 0) return [];

    const weekEvents = weekIds.data?.map((_id: string) => entities[_id]);
    const _allDayEvents: Schema_GridEvent_NoPosition[] = weekEvents
      ?.filter(
        (event): event is EventWithDates =>
          Boolean(event?.isAllDay) && hasEventDates(event),
      )
      .map(assembleGridEvent);
    const { allDayEvents } = assignEventsToRow(_allDayEvents);
    return allDayEvents;
  },
);

export const selectEventById = (
  state: RootState,
  id: string,
): Schema_Event | null => selectEventEntities(state)[id] ?? null;

export const selectGridEvents = createSelector(
  (state: RootState) => state.events.entities.value || {},
  (state: RootState) => state.events.getWeekEvents.value || [],
  (entities, weekIds) => {
    if (!("data" in weekIds) || weekIds.data.length === 0) return [];
    const weekEventsMapped = weekIds.data.map((_id: string) => entities[_id]);

    const weekEvents: Schema_GridEvent[] = weekEventsMapped
      .filter(
        (event): event is EventWithDates =>
          event !== undefined && !event.isAllDay && hasEventDates(event),
      )
      .map(assembleGridEvent);

    return weekEvents;
  },
);

export const selectRowCount = createSelector(
  selectAllDayEvents,
  (allDayEvents: Schema_GridEvent[]) => {
    const _rowVals = allDayEvents
      .map((e) => e.row)
      .filter((row): row is number => row !== undefined);
    const rowsCount = (_rowVals ?? []).length === 0 ? 1 : Math.max(..._rowVals);
    return rowsCount;
  },
);

const selectDayEventIds = (state: RootState) =>
  state.events.getDayEvents.value?.data ?? EMPTY_EVENT_IDS;

export const selectDayEvents = createSelector(
  selectEventEntities,
  selectDayEventIds,
  (entities, ids) =>
    ids
      .map((id: string) => entities[id])
      .filter((event): event is Schema_Event => Boolean(event)),
);

export const selectTimedDayEvents = createSelector(selectDayEvents, (events) =>
  events
    .filter(
      (event): event is EventWithDates =>
        !event.isAllDay && hasEventDates(event),
    )
    .map(assembleGridEvent),
);

export const selectAllDayDayEvents = createSelector(
  selectDayEvents,
  (events) => {
    const allDayEvents = events
      .filter(
        (event): event is EventWithDates =>
          Boolean(event.isAllDay) && hasEventDates(event),
      )
      .map(assembleGridEvent);

    return assignEventsToRow(allDayEvents).allDayEvents;
  },
);

export const selectDayRowCount = createSelector(
  selectAllDayDayEvents,
  (allDayEvents) => {
    const rows = allDayEvents
      .map((event) => event.row)
      .filter((row): row is number => row !== undefined);
    return rows.length === 0 ? 1 : Math.max(...rows);
  },
);

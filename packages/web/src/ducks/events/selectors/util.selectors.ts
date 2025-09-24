import { createSelector } from "@reduxjs/toolkit";
import { isProcessing } from "@web/common/store/helpers";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { RootState } from "@web/store";

type SectionType_Sidebar = "someday" | "currentMonth";

export type SectionType = SectionType_Sidebar | "week";

export const selectIsProcessing = createSelector(
  [
    (state: RootState) => isProcessing(state.events.editEvent),
    (state: RootState) => isProcessing(state.events.createEvent),
    (state: RootState) => isProcessing(state.events.getWeekEvents),
  ],
  (editEventsProcessing, createEventsProcessing, geWeekEventsProcessing) =>
    editEventsProcessing || createEventsProcessing || geWeekEventsProcessing,
);

export const selectIsGetWeekEventsProcessingWithReason = createSelector(
  (state: RootState) => state.events.getWeekEvents,
  (state) => {
    const _isProcessing = isProcessing(state);
    const _reason = state.reason as Week_AsyncStateContextReason;

    return {
      isProcessing: _isProcessing,
      reason: _reason,
    };
  },
);

export const selectPaginatedEventsBySectionType = createSelector(
  [
    (state: RootState) => state.events,
    (_: RootState, type: SectionType) => type,
  ],
  (events: RootState["events"], type: SectionType) => {
    const statePieceName = type.charAt(0).toUpperCase() + type.slice(1);
    const statePiece = events[`get${statePieceName}Events` as "getWeekEvents"];
    const { error } = statePiece;

    return error ? null : statePiece.value;
  },
);

export const selectEventIdsBySectionType = createSelector(
  selectPaginatedEventsBySectionType,
  (paginatedEvents) => paginatedEvents?.data ?? [],
);

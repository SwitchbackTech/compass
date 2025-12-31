import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@web/store";

export const selectPendingEventIds = (state: RootState): string[] =>
  state.events.pendingEvents.eventIds;

export const selectIsEventPending = createSelector(
  [selectPendingEventIds, (_state: RootState, eventId: string) => eventId],
  (pendingIds, eventId) => pendingIds.includes(eventId),
);

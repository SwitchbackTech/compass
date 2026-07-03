import { createSelector } from "@reduxjs/toolkit";
import { type RootState } from "@web/store";

type SectionType_Sidebar = "someday";

export type SectionType = SectionType_Sidebar | "week";

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

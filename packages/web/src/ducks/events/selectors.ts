import { isProcessing, isSuccess } from "@web/common/store/helpers";
import { EventEntity } from "@web/common/types/entities";
import { RootState } from "@store";

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

export const selectPaginatedEventsBySectionType = (
  state: RootState,
  type: SectionType
) => {
  const statePieceName = type.charAt(0).toUpperCase() + type.slice(1);
  const statePiece =
    state.events[`get${statePieceName}Events` as "getWeekEvents"];

  return (isSuccess(statePiece) && statePiece.value) || null;
};

export const selectEventIdsBySectionType = (
  state: RootState,
  type: SectionType
) => (selectPaginatedEventsBySectionType(state, type) || {}).data || [];

export const selectEventEntities = (state: RootState) =>
  state.events.entities.value || {};

export const selectEventById = (state: RootState, id: string): EventEntity =>
  selectEventEntities(state)[id] || {};

export const selectIsCreateEventProcessing = (state: RootState) =>
  isProcessing(state.events.createEvent);

export const selectIsEditEventProcessing = (state: RootState) =>
  isProcessing(state.events.editEvent);

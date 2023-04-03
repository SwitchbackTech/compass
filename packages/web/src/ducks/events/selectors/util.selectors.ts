import { isProcessing, isSuccess } from "@web/common/store/helpers";
import { RootState } from "@web/store";

type SectionType_Sidebar = "someday" | "currentMonth";

export type SectionType = SectionType_Sidebar | "week";

export const selectIsProcessing = (state: RootState) =>
  isProcessing(state.events.editEvent) ||
  isProcessing(state.events.createEvent) ||
  isProcessing(state.events.getWeekEvents);

export const selectEventIdsBySectionType = (
  state: RootState,
  type: SectionType
) => (selectPaginatedEventsBySectionType(state, type) || {}).data || [];

export const selectPaginatedEventsBySectionType = (
  state: RootState,
  type: SectionType
) => {
  const statePieceName = type.charAt(0).toUpperCase() + type.slice(1);
  const statePiece =
    state.events[`get${statePieceName}Events` as "getWeekEvents"];

  return (isSuccess(statePiece) && statePiece.value) || null;
};

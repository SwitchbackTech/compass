import { RootState } from "@web/store";

export const selectDraft = (state: RootState) => state.events.draft.event;

export const selectDraftStatus = (state: RootState) =>
  state.events.draft.status;

export const selectDraftId = (
  state: RootState
): { isDrafting: boolean; draftId: string } => {
  return {
    isDrafting: state.events.draft.status.isDrafting,
    draftId: state.events.draft.event?._id,
  };
};

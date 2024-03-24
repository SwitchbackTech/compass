import { RootState } from "@web/store";
import { createSelector } from "reselect";

export const selectDraft = (state: RootState) => state.events.draft.event;
export const selectDraftStatus = (state: RootState) =>
  state.events.draft.status;

export const selectDraftId = createSelector(
  selectDraftStatus,
  selectDraft,
  (status, draft) => ({
    isDrafting: status.isDrafting,
    draftId: draft?._id,
  })
);

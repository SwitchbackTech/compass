import { RootState } from "@web/store";

export const selectDraft = (state: RootState) => state.events.draft.event;

export const selectDraftStatus = (state: RootState) =>
  state.events.draft.status;

export const selectIsDrafting = (state: RootState) =>
  state.events.draft.status.isDrafting;

export const selectDraftId = (state: RootState) =>
  state.events.draft.event?._id;

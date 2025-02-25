import { Categories_Event } from "@core/types/event.types";
import { RootState } from "@web/store";

export const selectDraft = (state: RootState) => state.events.draft.event;

export const selectDraftActivity = (state: RootState) =>
  state.events.draft.status?.activity;

export const selectDraftCategory = (state: RootState) =>
  state.events.draft.status?.eventType;

export const selectDraftStatus = (state: RootState) =>
  state.events.draft.status;

export const selectIsDrafting = (state: RootState) =>
  state.events.draft.status?.isDrafting;

export const selectIsDNDing = (state: RootState) =>
  state.events.draft.status?.activity === "dnd";

export const selectIsDraftingExisting = (state: RootState) =>
  state.events.draft.event?._id !== undefined;

export const selectIsDraftingSomeday = (state: RootState) =>
  state.events.draft.status?.eventType === Categories_Event.SOMEDAY_WEEK ||
  state.events.draft.status?.eventType === Categories_Event.SOMEDAY_MONTH;

export const selectDraftId = (state: RootState) =>
  state.events.draft.event?._id;

import { Categories_Event } from "@core/types/event.types";
import { RootState } from "@web/store";

export const selectDraft = (state: RootState) => state.events.draft.event;

export const selectDraftStatus = (state: RootState) =>
  state.events.draft.status;

export const selectIsDrafting = (state: RootState) =>
  state.events.draft.status?.isDrafting;

export const selectIsDraftingExisting = (state: RootState) =>
  state.events.draft.event?._id !== undefined;

export const selectIsDraftingSomeday = (state: RootState) =>
  state.events.draft.status.eventType === Categories_Event.SOMEDAY_WEEK ||
  state.events.draft.status.eventType === Categories_Event.SOMEDAY_MONTH;

export const selectIsDragging = (state: RootState) =>
  state.events.draft.status?.activity === "dragging";

export const selectIsResizing = (state: RootState) =>
  state.events.draft.status?.activity === "resizing";

export const selectDraftId = (state: RootState) =>
  state.events.draft.event?._id;

export const selectDraftLocation = (state: RootState) =>
  state.events.draft.status?.location;

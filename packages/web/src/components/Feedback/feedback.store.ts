import { create } from "zustand";
import { type ViewName } from "@web/shortcuts/shortcuts.constants";

export type FeedbackKind = "bug" | "suggestion";

export interface FeedbackRequest {
  kind: FeedbackKind;
  view: ViewName;
}

interface FeedbackState {
  request: FeedbackRequest | null;
}

export const useFeedbackStore = create<FeedbackState>()(() => ({
  request: null,
}));

export const feedbackActions = {
  open: (kind: FeedbackKind, view: ViewName) =>
    useFeedbackStore.setState({ request: { kind, view } }),
  close: () => useFeedbackStore.setState({ request: null }),
};

export const selectFeedbackRequest = (state: FeedbackState) => state.request;

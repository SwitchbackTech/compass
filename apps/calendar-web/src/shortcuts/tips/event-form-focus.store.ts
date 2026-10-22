import { create } from "zustand";
import {
  eventFormFocusInsideForm,
  eventFormTabNavigationApplies,
} from "@web/shortcuts/tips/event-form-focus.util";

type EventFormFocusState = {
  focusInsideForm: boolean;
  tabNavigationApplies: boolean;
  syncFromDocument: () => void;
  resetForTests: () => void;
};

const initialState = {
  focusInsideForm: false,
  tabNavigationApplies: false,
} as const;

export const useEventFormFocusStore = create<EventFormFocusState>((set) => ({
  ...initialState,
  syncFromDocument: () => {
    const active = document.activeElement;
    set({
      focusInsideForm: eventFormFocusInsideForm(active),
      tabNavigationApplies: eventFormTabNavigationApplies(active),
    });
  },
  resetForTests: () => set(initialState),
}));

export const selectEventFormFocusInside = (state: EventFormFocusState) =>
  state.focusInsideForm;

export const selectEventFormTabNavigationApplies = (
  state: EventFormFocusState,
) => state.tabNavigationApplies;

export const resetEventFormFocusStoreForTests = (): void => {
  useEventFormFocusStore.getState().resetForTests();
};

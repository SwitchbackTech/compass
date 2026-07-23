import { create } from "zustand";

export interface WelcomeGuideState {
  isOpen: boolean;
}

export const useWelcomeGuideStore = create<WelcomeGuideState>()(() => ({
  isOpen: false,
}));

export const welcomeGuideActions = {
  open: () => useWelcomeGuideStore.setState({ isOpen: true }),
  close: () => useWelcomeGuideStore.setState({ isOpen: false }),
};

export const selectWelcomeGuideOpen = (state: WelcomeGuideState) =>
  state.isOpen;

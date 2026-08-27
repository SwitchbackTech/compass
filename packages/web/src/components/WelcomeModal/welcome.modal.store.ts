import { create } from "zustand";

export interface WelcomeModalState {
  isOpen: boolean;
}

export const useWelcomeModalStore = create<WelcomeModalState>()(() => ({
  isOpen: false,
}));

export const welcomeModalActions = {
  setOpen: (isOpen: boolean) => useWelcomeModalStore.setState({ isOpen }),
};

export const selectWelcomeModalOpen = (state: WelcomeModalState) =>
  state.isOpen;

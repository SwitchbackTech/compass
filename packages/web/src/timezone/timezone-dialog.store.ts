import { create } from "zustand";

interface TimezoneDialogState {
  isOpen: boolean;
}

export const useTimezoneDialogStore = create<TimezoneDialogState>()(() => ({
  isOpen: false,
}));

export const timezoneDialogActions = {
  open: () => useTimezoneDialogStore.setState({ isOpen: true }),
  close: () => useTimezoneDialogStore.setState({ isOpen: false }),
};

export const selectTimezoneDialogOpen = (state: TimezoneDialogState) =>
  state.isOpen;

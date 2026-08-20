import { create } from "zustand";

interface TimezoneDialogState {
  isOpen: boolean;
  restoreFocus?: () => void;
}

export const useTimezoneDialogStore = create<TimezoneDialogState>()(() => ({
  isOpen: false,
}));

export const timezoneDialogActions = {
  open: (restoreFocus?: () => void) =>
    useTimezoneDialogStore.setState({ isOpen: true, restoreFocus }),
  close: () =>
    useTimezoneDialogStore.setState({
      isOpen: false,
      restoreFocus: undefined,
    }),
};

export const selectTimezoneDialogOpen = (state: TimezoneDialogState) =>
  state.isOpen;

export const selectTimezoneDialogRestoreFocus = (state: TimezoneDialogState) =>
  state.restoreFocus;

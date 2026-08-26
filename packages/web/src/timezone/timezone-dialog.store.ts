import { create } from "zustand";

export type TimezoneDialogPurpose =
  | "pin"
  | "time-travel"
  | "availability-recipient";

interface TimezoneDialogState {
  isOpen: boolean;
  purpose: TimezoneDialogPurpose;
  restoreFocus?: () => void;
  onSelect?: (timeZone: string | null) => void;
}

export const useTimezoneDialogStore = create<TimezoneDialogState>()(() => ({
  isOpen: false,
  purpose: "pin",
}));

export const timezoneDialogActions = {
  open: (
    restoreFocus?: () => void,
    purpose: TimezoneDialogPurpose = "pin",
    onSelect?: (timeZone: string | null) => void,
  ) =>
    useTimezoneDialogStore.setState({
      isOpen: true,
      purpose,
      restoreFocus,
      onSelect,
    }),
  close: () =>
    useTimezoneDialogStore.setState({
      isOpen: false,
      purpose: "pin",
      restoreFocus: undefined,
      onSelect: undefined,
    }),
};

export const selectTimezoneDialogOpen = (state: TimezoneDialogState) =>
  state.isOpen;

export const selectTimezoneDialogPurpose = (state: TimezoneDialogState) =>
  state.purpose;

export const selectTimezoneDialogRestoreFocus = (state: TimezoneDialogState) =>
  state.restoreFocus;
export const selectTimezoneDialogOnSelect = (state: TimezoneDialogState) =>
  state.onSelect;

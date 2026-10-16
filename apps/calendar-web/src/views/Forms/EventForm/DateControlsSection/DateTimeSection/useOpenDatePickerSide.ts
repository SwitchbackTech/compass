import { useState } from "react";

export type DatePickerSide = "start" | "end";

export interface OpenDatePickerSide {
  /** The side whose calendar is open, or null when neither is. */
  openSide: DatePickerSide | null;
  open: (side: DatePickerSide) => void;
  /**
   * Closes `side` only when it is the open one: react-datepicker reports the
   * outgoing picker's close after the incoming one opened, so an
   * unconditional close would shut the calendar that just replaced it.
   */
  close: (side: DatePickerSide) => void;
  /** Closes whichever side is open; returns whether one was. */
  closeAll: () => boolean;
}

/**
 * Which of a start/end date picker pair is open. Two independent booleans
 * allowed both at once and made every open handler responsible for closing
 * its sibling; the open side is the whole state.
 */
export const useOpenDatePickerSide = (): OpenDatePickerSide => {
  const [openSide, setOpenSide] = useState<DatePickerSide | null>(null);

  return {
    openSide,
    open: setOpenSide,
    close: (side) =>
      setOpenSide((current) => (current === side ? null : current)),
    closeAll: () => {
      setOpenSide(null);
      return openSide !== null;
    },
  };
};

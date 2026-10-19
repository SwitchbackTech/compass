import { useCallback, useRef, useState } from "react";

export type StartEndSide = "start" | "end";

export interface OpenSide {
  /** The side whose overlay is open, or null when neither is. */
  openSide: StartEndSide | null;
  open: (side: StartEndSide) => void;
  /**
   * Closes `side` only when it is the open one: both react-datepicker and
   * react-select report the outgoing overlay's close after the incoming one
   * opened, so an unconditional close would shut the overlay that just
   * replaced it.
   */
  close: (side: StartEndSide) => void;
  /** Closes whichever side is open; returns whether one was. */
  closeAll: () => boolean;
}

/**
 * Which of a start/end overlay pair is open: a date picker calendar in
 * DatePickers, a time combobox menu in TimePickers. Two independent booleans
 * allowed both at once and made every open handler responsible for closing
 * its sibling; the open side is the whole state.
 *
 * The callbacks are stable, so a consumer can hand one to a child that keeps
 * it in an effect dependency list.
 */
export const useOpenSide = (): OpenSide => {
  const [openSide, setOpenSide] = useState<StartEndSide | null>(null);
  const openSideRef = useRef(openSide);
  openSideRef.current = openSide;

  const open = useCallback((side: StartEndSide) => setOpenSide(side), []);

  const close = useCallback((side: StartEndSide) => {
    setOpenSide((current) => (current === side ? null : current));
  }, []);

  const closeAll = useCallback(() => {
    const wasOpen = openSideRef.current !== null;
    setOpenSide(null);
    return wasOpen;
  }, []);

  return { openSide, open, close, closeAll };
};

import { type PointerEvent } from "react";

/**
 * Seats focus on the hovered control so Enter activates that element rather
 * than whichever sibling was focused on open. Touch/pen are skipped: those
 * already activate on tap, and a focus move would steal from the real target.
 */
export const focusOnPointerEnter = (event: PointerEvent<HTMLElement>): void => {
  if (event.pointerType !== "mouse") return;
  event.currentTarget.focus({ preventScroll: true });
};

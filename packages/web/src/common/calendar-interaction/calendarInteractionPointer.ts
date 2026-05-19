import { type CalendarInteractionPoint } from "./CalendarInteractionSession";

export interface CalendarInteractionPointerEligibilityInput {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  isPrimary: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export const isEligibleCalendarInteractionPointerDown = ({
  altKey,
  button,
  ctrlKey,
  isPrimary,
  metaKey,
  shiftKey,
}: CalendarInteractionPointerEligibilityInput) =>
  isPrimary !== false &&
  button === 0 &&
  !altKey &&
  !ctrlKey &&
  !metaKey &&
  !shiftKey;

export const hasExceededCalendarInteractionMoveThreshold = (
  current: CalendarInteractionPoint,
  initial: CalendarInteractionPoint,
  threshold: number,
) =>
  Math.abs(current.x - initial.x) > threshold ||
  Math.abs(current.y - initial.y) > threshold;

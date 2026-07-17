import { type InteractionPoint } from "./interaction.types";

export interface InteractionPointerEligibilityInput {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  isPrimary: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export const isEligibleInteractionPointerDown = ({
  altKey,
  button,
  ctrlKey,
  isPrimary,
  metaKey,
  shiftKey,
}: InteractionPointerEligibilityInput) =>
  isPrimary !== false &&
  button === 0 &&
  !altKey &&
  !ctrlKey &&
  !metaKey &&
  !shiftKey;

export const hasExceededInteractionMoveThreshold = (
  current: InteractionPoint,
  initial: InteractionPoint,
  threshold: number,
) =>
  Math.abs(current.x - initial.x) > threshold ||
  Math.abs(current.y - initial.y) > threshold;

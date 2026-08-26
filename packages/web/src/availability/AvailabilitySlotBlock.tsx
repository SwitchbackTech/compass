import classNames from "classnames";
import { type CSSProperties } from "react";
import { ZIndex } from "@web/common/constants/web.constants";
import { type EventPosition } from "@web/grid/types/grid.types";
import { AVAILABILITY_SLOT_ATTRIBUTE } from "./availability-slot.focus";

interface Props {
  /** Screen-reader name; the visible label is the time range alone. */
  ariaLabel: string;
  isAccepted: boolean;
  isActive: boolean;
  position: EventPosition;
  slotId: string;
  timeLabel: string;
}

/**
 * One offered time on the grid. Positioned by the same
 * `getBusyPeriodPosition` math the busy blocks use, so it lands inside its day
 * column rather than under the hour-label gutter.
 *
 * It is a `<button>` because it holds real DOM focus and arrow keys act on the
 * focused pick - but it carries no click handler: pointer events never reach
 * it (shortcuts/keyboard-only/usePointerSuppression.ts), so a click handler
 * would be dead code that implies an interaction the app does not support.
 */
export const AvailabilitySlotBlock = ({
  ariaLabel,
  isAccepted,
  isActive,
  position,
  slotId,
  timeLabel,
}: Props) => {
  const style: CSSProperties = {
    height: position.height || 0,
    left: position.left,
    top: position.top,
    width: position.width || 0,
    zIndex: position.zIndex ?? ZIndex.LAYER_3,
  };

  return (
    <button
      {...{ [AVAILABILITY_SLOT_ATTRIBUTE]: slotId }}
      aria-label={ariaLabel}
      aria-selected={isAccepted}
      className={classNames(
        "c-focus-ring absolute overflow-hidden rounded-xs px-1 py-0.5 text-left text-xs leading-tight",
        // Accepted reads as done (solid fill); the one being repositioned is
        // outlined solid; the rest wait in a fainter dashed outline.
        isAccepted && "bg-accent text-on-accent",
        !isAccepted &&
          (isActive
            ? "border-2 border-accent bg-accent/25 text-text"
            : "border border-accent/60 border-dashed bg-accent/10 text-text-muted"),
        isActive && "ring-1 ring-accent ring-offset-1 ring-offset-background",
      )}
      role="option"
      style={style}
      // Only the active pick is in the tab order; Tab cycles picks through the
      // store instead of walking every block.
      tabIndex={isActive ? 0 : -1}
      type="button"
    >
      <span aria-hidden>{timeLabel}</span>
    </button>
  );
};

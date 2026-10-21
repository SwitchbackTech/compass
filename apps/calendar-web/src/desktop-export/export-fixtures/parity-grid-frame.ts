import { gridMarginLeftFor } from "@web/grid/grid.constants";
import { type EventPosition } from "@web/grid/types/grid.types";

/**
 * Web timed layers sit inside the margined track (`timedTrackLeftPx`). macOS
 * CompassKit parity vectors and snapshots use grid-root coordinates (time
 * gutter included), matching `EventPositionCalculator` in Swift.
 */
export function eventPositionInParityGridFrame(
  position: EventPosition,
  options?: { hasSecondaryTimeZone?: boolean },
): EventPosition {
  const margin = gridMarginLeftFor(options?.hasSecondaryTimeZone ?? false);
  return {
    ...position,
    left: position.left + margin,
  };
}

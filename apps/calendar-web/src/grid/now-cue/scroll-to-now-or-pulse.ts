import {
  isNowLineInTimedGridViewport,
  isTimedGridNearScrollToNow,
  isTimedGridScrolledToNow,
  scrollTimedGridToNow,
} from "@web/common/utils/grid/grid.util";
import { nowCueActions } from "@web/grid/now-cue/now-cue.store";

export const scrollToNowOrPulse = (
  timedGrid: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
) => {
  if (!timedGrid) return;

  // Read both before scrolling: afterwards every grid looks like "at now".
  const atNow = isTimedGridScrolledToNow(timedGrid);
  const nearNow =
    isNowLineInTimedGridViewport(timedGrid) &&
    isTimedGridNearScrollToNow(timedGrid);

  if (!atNow) scrollTimedGridToNow(timedGrid, behavior);

  // Already looking at now, so there is nothing to scroll to: teach instead.
  if (atNow || nearNow) nowCueActions.pulse();
};

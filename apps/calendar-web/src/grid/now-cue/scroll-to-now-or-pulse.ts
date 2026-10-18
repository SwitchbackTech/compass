import {
  isNowLineInTimedGridViewport,
  scrollTimedGridToNow,
} from "@web/common/utils/grid/grid.util";
import { nowCueActions } from "@web/grid/now-cue/now-cue.store";

export const scrollToNowOrPulse = (
  timedGrid: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
) => {
  if (!timedGrid) return;

  // Read before scrolling. Don't compare against the scroll target: after
  // midday it sits past the bottom of the grid and is never reached.
  const nowLineVisible = isNowLineInTimedGridViewport(timedGrid);

  scrollTimedGridToNow(timedGrid, behavior);

  // The now line is already on screen, so a scroll alone shows little: teach.
  if (nowLineVisible) nowCueActions.pulse();
};

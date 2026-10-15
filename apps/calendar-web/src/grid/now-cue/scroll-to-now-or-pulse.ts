import {
  isNowLineInTimedGridViewport,
  isTimedGridNearScrollToNow,
  isTimedGridScrolledToNow,
  scrollTimedGridToNow,
} from "@web/common/utils/grid/grid.util";
import { nowCueActions } from "@web/grid/now-cue/now-cue.store";

export const scrollToNowOrPulse = (
  timedGrid: HTMLElement | null | undefined,
  behavior: ScrollBehavior = "smooth",
) => {
  if (!timedGrid) return;

  const strictAtNow = isTimedGridScrolledToNow(timedGrid);
  const teachPulse =
    strictAtNow ||
    (isNowLineInTimedGridViewport(timedGrid) &&
      isTimedGridNearScrollToNow(timedGrid));

  if (teachPulse) {
    if (!strictAtNow) {
      scrollTimedGridToNow(timedGrid, behavior);
    }
    nowCueActions.pulse();
    return;
  }

  scrollTimedGridToNow(timedGrid, behavior);
};

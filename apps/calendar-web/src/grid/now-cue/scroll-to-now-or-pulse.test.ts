import {
  getMinuteHeight,
  getScrollToNowTop,
} from "@web/common/utils/grid/grid.util";
import { nowCueActions, useNowCueStore } from "@web/grid/now-cue/now-cue.store";
import { scrollToNowOrPulse } from "@web/grid/now-cue/scroll-to-now-or-pulse";
import { afterEach, describe, expect, it, mock, setSystemTime } from "bun:test";

const clientHeight = 1440;

const makeGrid = (scrollTop: number) => {
  const scroll = mock(() => {});
  const grid = { clientHeight, scrollTop, scroll } as unknown as HTMLElement;
  return { grid, scroll };
};

describe("scrollToNowOrPulse", () => {
  afterEach(() => {
    setSystemTime();
    nowCueActions.resetForTests();
  });

  it("pulses instead of scrolling when already at now", () => {
    setSystemTime(new Date(2026, 1, 5, 12));
    const { grid, scroll } = makeGrid(getScrollToNowTop(clientHeight));

    scrollToNowOrPulse(grid);

    expect(scroll).not.toHaveBeenCalled();
    expect(useNowCueStore.getState().active).toBe(true);
    expect(useNowCueStore.getState().pulseGeneration).toBe(1);
  });

  it("scrolls and pulses when the now line is visible but off target", () => {
    setSystemTime(new Date(2026, 1, 5, 12));
    const minuteHeight = getMinuteHeight(clientHeight);
    const { grid, scroll } = makeGrid(
      getScrollToNowTop(clientHeight) + minuteHeight * 60,
    );

    scrollToNowOrPulse(grid);

    expect(scroll).toHaveBeenCalled();
    expect(useNowCueStore.getState().active).toBe(true);
  });

  it("pulses when the grid cannot scroll as far as the target", () => {
    // Late in the day the target sits past the max scroll, so the grid
    // rests short of it with the now line still on screen.
    setSystemTime(new Date(2026, 1, 5, 21, 30));
    const minuteHeight = getMinuteHeight(clientHeight);
    const maxScrollTop = 24 * 60 * minuteHeight - clientHeight;
    const { grid } = makeGrid(maxScrollTop);

    scrollToNowOrPulse(grid);

    expect(useNowCueStore.getState().active).toBe(true);
  });

  it("scrolls without pulsing when the now line is off screen", () => {
    setSystemTime(new Date(2026, 1, 5, 20));
    const { grid, scroll } = makeGrid(0);

    scrollToNowOrPulse(grid);

    expect(scroll).toHaveBeenCalled();
    expect(useNowCueStore.getState().active).toBe(false);
  });

  it("increments pulseGeneration on repeated presses at now", () => {
    setSystemTime(new Date(2026, 1, 5, 12));
    const { grid } = makeGrid(getScrollToNowTop(clientHeight));

    scrollToNowOrPulse(grid);
    scrollToNowOrPulse(grid);

    expect(useNowCueStore.getState().pulseGeneration).toBe(2);
  });
});

import { NodeEnv } from "@core/constants/core.constants";
import {
  EVENT_ALLDAY_GAP,
  EVENT_ALLDAY_ROW_HEIGHT,
} from "@web/grid/grid.constants";
import {
  ALL_DAY_ROW_SPARE_LANE_PX,
  allDayLaneCountFromEvents,
  allDayRowStackHeightPx,
  compactAllDayRowHeightPx,
  isCompactAllDayRowHeightEnabled,
} from "@web/grid/utils/allDayRowHeight.util";
import { describe, expect, it } from "bun:test";

describe("allDayRowHeight.util", () => {
  it("enables compact height outside production", () => {
    expect(isCompactAllDayRowHeightEnabled(NodeEnv.Staging)).toBe(true);
    expect(isCompactAllDayRowHeightEnabled(NodeEnv.Development)).toBe(true);
    expect(isCompactAllDayRowHeightEnabled(NodeEnv.Production)).toBe(false);
  });

  it("sizes the stack from lane count with a one-row floor", () => {
    expect(allDayRowStackHeightPx(0)).toBe(
      2 * EVENT_ALLDAY_GAP + EVENT_ALLDAY_ROW_HEIGHT,
    );
    expect(allDayRowStackHeightPx(3)).toBe(
      2 * EVENT_ALLDAY_GAP + 3 * EVENT_ALLDAY_ROW_HEIGHT,
    );
  });

  it("adds a spare lane below the stack for empty clicks", () => {
    expect(compactAllDayRowHeightPx(1)).toBe(
      allDayRowStackHeightPx(1) + ALL_DAY_ROW_SPARE_LANE_PX,
    );
    expect(compactAllDayRowHeightPx(3)).toBe(
      allDayRowStackHeightPx(3) + ALL_DAY_ROW_SPARE_LANE_PX,
    );
  });

  it("derives lane count from assigned row numbers", () => {
    expect(allDayLaneCountFromEvents([])).toBe(1);
    expect(
      allDayLaneCountFromEvents([
        { row: 1 } as never,
        { row: 3 } as never,
        { row: 2 } as never,
      ]),
    ).toBe(3);
  });
});

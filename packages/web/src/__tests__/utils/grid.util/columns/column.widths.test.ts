import {
  getColumnWidthPercentages,
  getRelativePercentages,
} from "@web/common/utils/grid.util";
import { FLEX_TODAY, FLEX_TMRW } from "@web/views/Calendar/layout.constants";

import { runStandardChecks } from "./column.helpers";

describe("today: 1/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 0;
    const widths = getColumnWidthPercentages(todayIndex);
    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order", () => {
    const todayIndex = 0;

    const widths = getColumnWidthPercentages(todayIndex);
    const { current } = widths;
    const { afterTmrw } = getRelativePercentages(todayIndex);

    expect(current[0]).toEqual(FLEX_TODAY);
    expect(current[1]).toEqual(FLEX_TMRW);
    expect(current[2]).toEqual(afterTmrw);
    expect(current[3]).toEqual(afterTmrw);
    expect(current[4]).toEqual(afterTmrw);
    expect(current[5]).toEqual(afterTmrw);
    expect(current[6]).toEqual(afterTmrw);
  });
});

describe("today: 2/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 1;
    const widths = getColumnWidthPercentages(todayIndex);

    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order ", () => {
    const todayIndex = 1;

    const widths = getColumnWidthPercentages(todayIndex);
    const { afterTmrw, beforeToday } = getRelativePercentages(todayIndex);

    expect(widths.current).toEqual([
      beforeToday,
      FLEX_TODAY,
      FLEX_TMRW,
      afterTmrw,
      afterTmrw,
      afterTmrw,
      afterTmrw,
    ]);
  });
});

describe("today: 3/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 2;
    const widths = getColumnWidthPercentages(todayIndex);

    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order ", () => {
    const todayIndex = 2;

    const widths = getColumnWidthPercentages(todayIndex);
    const { afterTmrw, beforeToday } = getRelativePercentages(todayIndex);

    expect(widths.current).toEqual([
      beforeToday,
      beforeToday,
      FLEX_TODAY,
      FLEX_TMRW,
      afterTmrw,
      afterTmrw,
      afterTmrw,
    ]);
  });
});

describe("today: 4/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 3;
    const widths = getColumnWidthPercentages(todayIndex);

    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order ", () => {
    const todayIndex = 3;

    const widths = getColumnWidthPercentages(todayIndex);
    const { afterTmrw, beforeToday } = getRelativePercentages(todayIndex);

    expect(widths.current).toEqual([
      beforeToday,
      beforeToday,
      beforeToday,
      FLEX_TODAY,
      FLEX_TMRW,
      afterTmrw,
      afterTmrw,
    ]);
  });
});

describe("today: 5/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 4;
    const widths = getColumnWidthPercentages(todayIndex);

    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order ", () => {
    const todayIndex = 4;

    const widths = getColumnWidthPercentages(todayIndex);
    const { afterTmrw, beforeToday } = getRelativePercentages(todayIndex);

    expect(widths.current).toEqual([
      beforeToday,
      beforeToday,
      beforeToday,
      beforeToday,
      FLEX_TODAY,
      FLEX_TMRW,
      afterTmrw,
    ]);
  });
});

describe("today: 6/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 5;
    const widths = getColumnWidthPercentages(todayIndex);
    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order", () => {
    const todayIndex = 5;
    const widths = getColumnWidthPercentages(todayIndex);

    const { beforeToday } = getRelativePercentages(todayIndex);
    expect(widths.current).toEqual([
      beforeToday,
      beforeToday,
      beforeToday,
      beforeToday,
      beforeToday,
      FLEX_TODAY,
      FLEX_TMRW,
    ]);
  });
});

describe("today: 7/7", () => {
  it("passes standard checks", () => {
    const todayIndex = 6;
    const widths = getColumnWidthPercentages(todayIndex);
    runStandardChecks(todayIndex, widths);
  });

  it("returns correct order", () => {
    const todayIndex = 6;

    const widths = getColumnWidthPercentages(todayIndex);
    const beforeToday = (100 - FLEX_TODAY) / todayIndex;

    expect(widths.current).toEqual([
      beforeToday,
      beforeToday,
      beforeToday,
      beforeToday,
      beforeToday,
      beforeToday,
      FLEX_TODAY,
    ]);
  });
});

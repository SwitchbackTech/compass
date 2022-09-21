import { sortLowToHigh, sum } from "@web/common/utils/index";
import { WidthPercentages } from "@web/common/types/util.types";
import { FLEX_TODAY, FLEX_EQUAL } from "@web/views/Calendar/layout.constants";

export const runStandardChecks = (
  todayIndex: number,
  res: WidthPercentages
) => {
  _addsUpTo100(res);
  _todayIsLargest(todayIndex, res.current);
  _uses7Days(res.pastFuture, res.current);
  _usesSameWidthForPastFuture(res.pastFuture);
};

const _addsUpTo100 = (res: WidthPercentages) => {
  const current = Math.round(sum(res.current));
  const pastFuture = Math.round(sum(res.pastFuture));
  expect(current).toEqual(100);
  expect(pastFuture).toEqual(100);
};

const _todayIsLargest = (todayIndex: number, current: number[]) => {
  const sorted = sortLowToHigh(current);

  const largest = sorted[current.length - 1];
  expect(current[todayIndex]).toEqual(largest);
  expect(current[todayIndex]).toEqual(FLEX_TODAY);
};
const _uses7Days = (pastFuture: number[], current: number[]) => {
  expect(pastFuture).toHaveLength(7);
  expect(current).toHaveLength(7);
};

const _usesSameWidthForPastFuture = (pastFuture: number[]) => {
  const allUseSameWidth = (widths: number[]) =>
    widths.every((w) => w === FLEX_EQUAL);
  expect(allUseSameWidth(pastFuture)).toBe(true);
};

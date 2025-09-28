export const roundToNext = (number: number, roundBy: number): number =>
  Math.ceil(number / roundBy) * roundBy;

export const roundToPrev = (number: number, roundBy: number): number =>
  Math.floor(number / roundBy) * roundBy;

export const sortLowToHigh = (vals: number[]) =>
  [...vals].sort(function (a, b) {
    return a - b;
  });

export const sum = (arr: number[]) =>
  arr.reduce(function (a, b) {
    return a + b;
  }, 0);

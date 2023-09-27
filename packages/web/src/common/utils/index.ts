export const headers = (token?: string) => {
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    return {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(
          "removedAsPartOfTokenRefactor"
        )}`,
      },
    };
  }
};

export const isDrafting = () =>
  document.getElementsByName("Event Form").length === 1;

export const roundToNearest = (x: number, roundBy: number) =>
  Math.round(x / roundBy) * roundBy;

export const roundToNext = (number: number, roundBy: number): number =>
  Math.ceil(number / roundBy) * roundBy;

export const sortLowToHigh = (vals: number[]) =>
  [...vals].sort(function (a, b) {
    return a - b;
  });

export const sum = (arr: number[]) =>
  arr.reduce(function (a, b) {
    return a + b;
  }, 0);

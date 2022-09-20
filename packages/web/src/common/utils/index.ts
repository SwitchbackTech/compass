import { ID_SIDEBAR_FORM } from "@web/common/constants/web.constants";

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

// refactor to a way that doesn't require checking DOM
export const isDraftingSomeday = () =>
  document.getElementById(ID_SIDEBAR_FORM) !== null;
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

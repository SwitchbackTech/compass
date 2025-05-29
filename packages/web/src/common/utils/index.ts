import {
  ID_CONTEXT_MENU_ITEMS,
  ID_EVENT_FORM,
  ID_SOMEDAY_EVENT_FORM,
} from "../constants/web.constants";

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
          "removedAsPartOfTokenRefactor",
        )}`,
      },
    };
  }
};

export const isEventFormOpen = () =>
  document.getElementsByName(ID_EVENT_FORM).length === 1 ||
  document.getElementsByName(ID_SOMEDAY_EVENT_FORM).length === 1;

export const isSomedayEventFormOpen = () =>
  document.getElementsByName(ID_SOMEDAY_EVENT_FORM).length === 1;

export const isContextMenuOpen = () => {
  const contextMenuItems = document.getElementById(ID_CONTEXT_MENU_ITEMS);
  return !!contextMenuItems;
};

export const roundToNearest = (x: number, roundBy: number) =>
  Math.round(x / roundBy) * roundBy;

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

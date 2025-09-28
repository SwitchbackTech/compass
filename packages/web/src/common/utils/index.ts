import {
  ID_CONTEXT_MENU_ITEMS,
  ID_SOMEDAY_EVENT_FORM,
} from "../constants/web.constants";

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

import { MouseEvent } from "react";

export const isRightClick = (e: MouseEvent) => {
  return e.button === 2;
};

export const isLeftClick = (e: MouseEvent) => {
  return e.button === 0;
};

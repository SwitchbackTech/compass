import { MouseEvent } from "react";

export const isRightClick = (e: MouseEvent) => {
  return e.button === 2;
};

import { FC } from "react";

interface Props {
  width: number;
}

// ++ remove if not using
export const useColumnWidths = (width: number) => {
  return {
    currentWeek: [width * 1.23, width * 0.098],
    pastFutureWeek: [width, width],
  };
};

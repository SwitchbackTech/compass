import { useEffect, useState } from "react";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import {
  SIDEBAR_X_START,
  GRID_Y_START,
} from "@web/views/Calendar/layout.constants";

export const useMousePosition = (
  isDragging: boolean,
  measurements: Measurements_Grid
) => {
  const [isOverGrid, setIsOverGrid] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  const { allDayRow } = measurements;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const x = e.clientX;
        const y = e.clientY;

        const isPastSidebar = x > SIDEBAR_X_START;
        const isOverAllDayRow =
          isPastSidebar && y < allDayRow.bottom && y > allDayRow.top;
        const isOverMainGrid =
          isPastSidebar && !isOverAllDayRow && y > GRID_Y_START;
        const isOverGrid = isOverAllDayRow || isOverMainGrid;

        setIsOverGrid(isOverGrid);
        setMouseCoords({ x, y });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [allDayRow?.bottom, allDayRow?.top, isDragging]);

  return { isOverGrid, mouseCoords };
};

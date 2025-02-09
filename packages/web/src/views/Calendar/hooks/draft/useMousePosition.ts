import { useEffect, useState } from "react";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import {
  SIDEBAR_X_START,
  GRID_Y_START,
} from "@web/views/Calendar/layout.constants";
import { Coordinates } from "@web/common/types/util.types";
import { getMousePosition } from "@web/common/utils/position/mouse.position";

export const useMousePosition = (
  isDragging: boolean,
  isFormOpen: boolean,
  measurements: Measurements_Grid
) => {
  const [isOverGrid, setIsOverGrid] = useState(false);
  const [isOverMainGrid, setIsOverMainGrid] = useState(false);
  const [isOverAllDayRow, setIsOverAllDayRow] = useState(false);

  const [mouseCoords, setMouseCoords] = useState<Coordinates>({ x: 0, y: 0 });

  const { allDayRow } = measurements;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      console.log("handling mouse move ...");
      if (!allDayRow?.bottom || !allDayRow?.top) {
        throw Error("Missing measurements for all-day row");
      }

      const x = e.clientX;
      const y = e.clientY;
      const { isOverGrid, isOverAllDayRow, isOverMainGrid } = getMousePosition(
        {
          allDayRowBottom: allDayRow?.bottom,
          allDayRowTop: allDayRow?.top,
          gridYStart: GRID_Y_START,
          sidebarXStart: SIDEBAR_X_START,
        },
        { x, y }
      );

      setIsOverGrid(isOverGrid);
      setIsOverAllDayRow(isOverAllDayRow);
      setIsOverMainGrid(isOverMainGrid);
      setMouseCoords({ x, y });
    };

    if (!isDragging || isFormOpen) return;

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [allDayRow?.bottom, allDayRow?.top, isDragging, isFormOpen]);

  return { isOverAllDayRow, isOverGrid, isOverMainGrid, mouseCoords };
};

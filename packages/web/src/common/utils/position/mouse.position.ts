import { Coordinates } from "@web/common/types/util.types";

type Layout = {
  allDayRowBottom: number;
  allDayRowTop: number;
  gridYStart: number;
  sidebarXStart: number;
};

export const getMousePosition = (layout: Layout, coordinates: Coordinates) => {
  const { allDayRowTop, allDayRowBottom, gridYStart, sidebarXStart } = layout;
  const { x, y } = coordinates;

  const isPastSidebar = x > sidebarXStart;

  const isOverAllDayRow =
    isPastSidebar && y < allDayRowBottom && y > allDayRowTop;

  const isOverMainGrid = isPastSidebar && !isOverAllDayRow && y > gridYStart;

  const isOverGrid = isOverAllDayRow || isOverMainGrid;

  return {
    isOverGrid,
    isOverMainGrid,
    isOverAllDayRow,
  };
};

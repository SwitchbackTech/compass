import React, { FC, memo } from "react";
import type { XYCoord } from "react-dnd";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/EventsList/SomedayEvent/styled";
import {
  GRID_X_START,
  GRID_Y_START,
  SIDEBAR_OPEN_WIDTH,
  SIDEBAR_X_START,
} from "@web/views/Calendar/layout.constants";
import { DAY_COMPACT, DAY_HOUR_MIN_M } from "@web/common/constants/dates";
import { EVENT_ALLDAY_HEIGHT } from "@web/common/constants/grid.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getWidthBuffer } from "@web/common/utils/grid.util";

import { StyledDraggableEvent } from "./styled";
import { WeekProps } from "../../hooks/useWeek";
import { DateCalcs } from "../../hooks/grid/useDateCalcs";

export interface Props {
  coordinates: XYCoord;
  dateCalcs: DateCalcs;
  event: Schema_GridEvent;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfSelectedWeekDay"];
}

export const DraggableEvent: FC<Props> = memo(function DraggableEvent({
  // export const DraggableEvent: FC<Props> = ({
  coordinates,
  dateCalcs,
  event,
  measurements,
  startOfView,
}) {
  const { x, y } = coordinates;
  const { allDayRow, colWidths } = measurements;

  /* Helpers */
  const _getHeight = () => {
    if (isOverAllDayRow) return EVENT_ALLDAY_HEIGHT;

    const height = isOverMainGrid
      ? measurements.hourHeight
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  };

  const _getTimePreview = () => {
    const minutes = dateCalcs.getMinuteByY(y);
    const format = isOverAllDayRow ? DAY_COMPACT : DAY_HOUR_MIN_M;
    const timePreview = startOfView
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format(format);
    return timePreview;
  };

  const _getWidth = () => {
    if (!isOverGrid) return SIDEBAR_OPEN_WIDTH - SIDEBAR_OPEN_WIDTH / 2; // keeping shorter width feels less abrupt upon change
    if (isOverMainGrid) {
      const buffer = getWidthBuffer(dayIndex) + 20;
      return measurements.colWidths[dayIndex] - buffer;
    }
    // allday
    return colWidths[dayIndex] - 15;
  };

  /* Position */
  const isPastSidebar = x > SIDEBAR_X_START;
  const isOverAllDayRow =
    isPastSidebar && y < allDayRow.bottom && y > allDayRow.top;
  const isOverMainGrid = isPastSidebar && !isOverAllDayRow && y > GRID_Y_START;
  const isOverGrid = isOverAllDayRow || isOverMainGrid;
  const gridX = x - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
  const dayIndex = dateCalcs.getDayNumberByX(gridX);

  /* Size */
  const height = _getHeight();
  const width = _getWidth();

  return (
    <StyledDraggableEvent
      className={"active"}
      duration={1}
      height={height}
      isOverGrid={isOverGrid}
      priority={event.priority}
      role="button"
      tabIndex={0}
      width={width}
    >
      <Flex alignItems={AlignItems.CENTER} flexWrap={FlexWrap.WRAP}>
        <Text size={12} role="textbox">
          {event.title}
        </Text>
      </Flex>

      {isOverGrid && (
        <Flex flexWrap={FlexWrap.WRAP}>
          <Text size={10}>{_getTimePreview()}</Text>
        </Flex>
      )}
    </StyledDraggableEvent>
  );
  // };
});

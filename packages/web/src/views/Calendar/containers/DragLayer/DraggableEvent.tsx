import React from "react";
import type { XYCoord } from "react-dnd";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/EventsList/SomedayEvent/styled";
import {
  SIDEBAR_WIDTH,
  X_PLUS_SIDEBAR_OFFSET,
} from "@web/views/Calendar/calendar.constants";

import { StyledDraggableEvent } from "./styled";

export interface Props {
  coordinates: XYCoord;
  event: Schema_GridEvent;
  weekViewProps: WeekViewProps;
}

// $$ memoize like DragPreview
export const DraggableEvent = ({
  coordinates,
  event,
  weekViewProps,
}: Props) => {
  const { component, core } = weekViewProps;
  const { x, y } = coordinates;

  /* Helpers */
  const _getHeight = () => {
    const heightMargin = 7; // arbitrary
    let height = heightMargin;

    if (isOverGrid && isOverAllDayRow) {
      return core.getAllDayEventCellHeight();
    }

    height = isOverGrid
      ? core.getEventCellHeight() - heightMargin
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  };

  const _getWidth = () => {
    const columnWidths = core.getColumnWidths();

    const widthMargin = 12; // arbitrary
    const width = isOverGrid
      ? columnWidths[dayIndex] - widthMargin
      : SIDEBAR_WIDTH - 80; // 40px padding on both sides

    return width;
  };

  /* Position */
  const isOverGrid = x > X_PLUS_SIDEBAR_OFFSET;
  const isOverAllDayRow = y < component.CALCULATED_GRID_Y_OFFSET;
  const gridX = x - component.CALCULATED_GRID_X_OFFSET;
  const dayIndex = core.getDayNumberByX(gridX);

  /* Size */
  const height = _getHeight();
  const width = _getWidth();

  /* Date & Time */
  const adjustedX = x - component.CALCULATED_GRID_X_OFFSET - SIDEBAR_WIDTH;
  const adjustedY = y - core.getYOffset();
  const minutes = core.getMinuteByMousePosition(adjustedY);
  const timePreview = component.startOfSelectedWeekDay
    .add(dayIndex, "day")
    .add(minutes, "minutes")
    .format("ddd h:mm"); //$$ move to constant with example

  return (
    <StyledDraggableEvent
      className={"active"}
      duration={1}
      height={height}
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

      {isOverGrid && !isOverAllDayRow && (
        <Flex flexWrap={FlexWrap.WRAP}>
          <Text size={10}>{timePreview}</Text>
        </Flex>
      )}
    </StyledDraggableEvent>
  );
};

import React from "react";
import type { XYCoord } from "react-dnd";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/EventsList/SomedayEvent/styled";
import {
  GRID_X_OFFSET,
  SIDEBAR_WIDTH,
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

  const isOverGrid = x > SIDEBAR_WIDTH + GRID_X_OFFSET;
  const hoverX =
    coordinates.x - component.CALCULATED_GRID_X_OFFSET + SIDEBAR_WIDTH;
  const adjustedY = y - component.CALCULATED_GRID_Y_OFFSET;

  /* Width & Height & Width */
  const height = isOverGrid ? core.getEventCellHeight() : SOMEDAY_EVENT_HEIGHT;

  const dayIndex = core.getDayNumberByX(hoverX);
  const columnWidths = core.getColumnWidths();
  const _padding = 12; // arbitrary
  const width = isOverGrid
    ? columnWidths[dayIndex] - _padding
    : SIDEBAR_WIDTH - 80; // 40px padding on both sides

  /* Date & Time */
  const minutes = core.getMinuteByMousePosition(adjustedY);
  const timePreview = component.startOfSelectedWeekDay
    .add(dayIndex, "day")
    .add(minutes, "minutes")
    .format("ddd H:mm"); // tue 7:00 //$$ move to constant

  return (
    <StyledDraggableEvent
      // className={"active"}
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

      {isOverGrid && (
        <Flex flexWrap={FlexWrap.WRAP}>
          <Text size={10}>{timePreview}</Text>
        </Flex>
      )}
    </StyledDraggableEvent>
  );
};

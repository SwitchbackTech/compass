import React from "react";
import type { XYCoord } from "react-dnd";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";

import { StyledDraggableEvent } from "./styled";

export interface Props {
  coordinates: XYCoord;
  event: Schema_GridEvent;
  weekViewProps: WeekViewProps;
}

// memoize like DragPreview
export const DraggableEvent = ({
  coordinates,
  event,
  weekViewProps,
}: Props) => {
  const { component, core, eventHandlers } = weekViewProps;

  const clickX = coordinates.x - component.CALCULATED_GRID_X_OFFSET;
  const clickY = coordinates.y - component.CALCULATED_GRID_Y_OFFSET;

  /* Width & Height & Width */
  const height = core.getEventCellHeight();

  const dayIndex = core.getDayNumberByX(clickX);
  const columnWidths = core.getColumnWidths();
  const width = columnWidths[dayIndex];

  /* Date & Time */
  const minutes = core.getMinuteByMousePosition(clickY);
  const timePreview = component.startOfSelectedWeekDay
    .add(dayIndex, "day")
    .add(minutes, "minutes")
    .format("ddd HH:mm");

  const _start = "2022-05-07T11:00:00-05:00";

  return (
    <StyledDraggableEvent
      className={"active"}
      duration={1}
      height={height}
      priority={event.priority}
      role="button"
      tabindex="0"
      width={width}
    >
      <Flex alignItems={AlignItems.CENTER} flexWrap={FlexWrap.WRAP}>
        <Text size={12} role="textbox">
          {event.title}
        </Text>
      </Flex>

      <Flex flexWrap={FlexWrap.WRAP}>
        <Text size={10}>{timePreview}</Text>
      </Flex>
    </StyledDraggableEvent>
  );
};

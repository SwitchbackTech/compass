import React, { FC, memo } from "react";
import type { XYCoord } from "react-dnd";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/EventsList/SomedayEvent/styled";
import {
  SIDEBAR_WIDTH,
  CALENDAR_SIDEBAR_X_START,
} from "@web/views/Calendar/calendar.constants";
import { DAY_HOUR_MIN_M } from "@web/common/constants/dates";
import { EVENT_PADDING_WIDTH } from "@web/common/constants/grid.constants";

import { StyledDraggableEvent } from "./styled";

export interface Props {
  coordinates: XYCoord;
  event: Schema_GridEvent;
  weekViewProps: WeekViewProps;
}

export const DraggableEvent: FC<Props> = memo(function DraggableEvent({
  coordinates,
  event,
  weekViewProps,
}) {
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
      ? core.getHourlyCellHeight() - heightMargin
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  };

  const _getWidth = () => {
    const width = isOverGrid
      ? component.columnWidths[dayIndex] - EVENT_PADDING_WIDTH
      : SIDEBAR_WIDTH - 80; // 40px padding on both sides

    return width;
  };

  /* Position */
  const isOverGrid = x > CALENDAR_SIDEBAR_X_START;
  const isOverAllDayRow = y < component.gridYOffset;
  const gridX = x - component.gridXOffset;
  const dayIndex = core.getDayNumberByX(gridX);

  /* Size */
  const height = _getHeight();
  const width = _getWidth();

  /* Date & Time */
  const adjustedY = y - component.gridYOffset;
  const minutes = core.getMinuteByMousePosition(adjustedY);
  const timePreview = component.startOfSelectedWeekDay
    .add(dayIndex, "day")
    .add(minutes, "minutes")
    .format(DAY_HOUR_MIN_M);

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
});

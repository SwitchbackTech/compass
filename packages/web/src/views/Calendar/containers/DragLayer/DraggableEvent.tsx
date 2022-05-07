import React from "react";
import dayjs from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import type { XYCoord } from "react-dnd";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { HOURS_MINUTES_FORMAT } from "@web/common/constants/dates";
import { roundByNumber } from "@web/common/utils";

import { StyledDraggableEvent } from "./styled";
import { GRID_TIME_STEP } from "../../constants";

//$$ temp

dayjs.extend(weekPlugin);

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

  const { x, y } = coordinates;

  const clickX = x - component.CALCULATED_GRID_X_OFFSET;
  const clickY = y - component.CALCULATED_GRID_Y_OFFSET;

  const dayIndex = core.getDayNumberByX(clickX);

  /* Width & Height */
  const columnWidths = core.getColumnWidths();
  const width = columnWidths[dayIndex];
  const height = core.getEventCellHeight();

  /* Times */
  // $$ turn into func and add to `getDateByMousePosition`
  const minutesOnGrid = Math.round(
    ((clickY + (component.eventsGridRef.current?.scrollTop || 0)) / height) * 60
  );

  const minute = roundByNumber(
    minutesOnGrid - GRID_TIME_STEP / 2,
    GRID_TIME_STEP
  );

  /* assemble */
  const startOfSelectedWeekDay = component.today
    .week(component.week)
    .startOf("week");

  const timePreview = startOfSelectedWeekDay
    .add(dayIndex, "day")
    .add(minute, "minutes")
    .format("ddd HH:mm");

  const _start = "2022-05-07T11:00:00-05:00";
  //   const endDate = dayjs(event.endDate).format(HOURS_AM_FORMAT);

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

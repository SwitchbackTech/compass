import React, { FC, memo } from "react";
import { DAY_COMPACT, DAY_HOUR_MIN_M } from "@core/constants/date.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getWidthBuffer } from "@web/common/utils/grid.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/EventsList/SomedayEvent/styled";
import { EVENT_ALLDAY_HEIGHT } from "@web/views/Calendar/layout.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { StyledDraggableEvent } from "./styled";
import { WeekProps } from "../../hooks/useWeek";
import { DateCalcs } from "../../hooks/grid/useDateCalcs";

export interface Props {
  dateCalcs: DateCalcs;
  dayIndex: number;
  event: Schema_GridEvent;
  isOverAllDayRow: boolean;
  isOverGrid: boolean;
  isOverMainGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: { x: number; y: number };
  startOfView: WeekProps["component"]["startOfView"];
}

export const DraggableEvent: FC<Props> = memo(function DraggableEvent({
  dateCalcs,
  dayIndex,
  event,
  isOverAllDayRow,
  isOverGrid,
  isOverMainGrid,
  measurements,
  mouseCoords,
  startOfView,
}) {
  const { colWidths } = measurements;

  /* Helpers */
  const _getHeight = () => {
    if (isOverAllDayRow) return EVENT_ALLDAY_HEIGHT;

    const height = isOverMainGrid
      ? measurements.hourHeight
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  };

  const _getTimePreview = () => {
    const minutes = dateCalcs.getMinuteByY(mouseCoords.y);
    const format = isOverAllDayRow ? DAY_COMPACT : DAY_HOUR_MIN_M;
    const timePreview = startOfView
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format(format);
    return timePreview;
  };

  const _getWidth = () => {
    // if (!isOverGrid) return SIDEBAR_OPEN_WIDTH / 2; // keeping shorter width feels less abrupt upon change
    // if (!isOverGrid) return 275; //++ convert to constant
    if (isOverMainGrid) {
      const buffer = getWidthBuffer(dayIndex) + 20;
      return measurements.colWidths[dayIndex] - buffer;
    }
    // allday
    return colWidths[dayIndex] - 15;
  };

  /* Size */
  const height = _getHeight();
  const width = _getWidth();

  return (
    <StyledDraggableEvent
      className={"active"}
      duration={1}
      height={height}
      isOverGrid={true}
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
});

import React, { FC, memo } from "react";
import { DAY_COMPACT, DAY_HOUR_MIN_M } from "@core/constants/date.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getWidthBuffer } from "@web/common/utils/grid.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/styled";
import { EVENT_ALLDAY_HEIGHT } from "@web/views/Calendar/layout.constants";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { snapToGrid } from "@web/views/Calendar/components/Event/Grid/GridEventPreview/snap.grid";
import { MouseCoords } from "@web/views/Calendar/hooks/mouse/useMousePosition";

import { getItemStyles, layerStyles, StyledGridEventPreview } from "./styled";

export interface Props {
  dateCalcs: DateCalcs;
  dayIndex: number;
  event: Schema_GridEvent;
  isOverAllDayRow: boolean;
  isOverMainGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: MouseCoords;
  startOfView: WeekProps["component"]["startOfView"];
  gridScrollRef: Refs_Grid["gridScrollRef"];
}

export const GridEventPreview: FC<Props> = memo(function GridEventPreview({
  dateCalcs,
  dayIndex,
  event,
  isOverAllDayRow,
  isOverMainGrid,
  measurements,
  mouseCoords,
  startOfView,
  gridScrollRef,
}) {
  const { colWidths } = measurements;
  const { x, y } = mouseCoords;

  /* Helpers */
  const getHeight = () => {
    if (isOverAllDayRow) return EVENT_ALLDAY_HEIGHT;

    const height = isOverMainGrid
      ? measurements.hourHeight
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  };

  const getTimePreview = () => {
    const minutes = dateCalcs.getMinuteByY(y);
    const format = isOverAllDayRow ? DAY_COMPACT : DAY_HOUR_MIN_M;
    const timePreview = startOfView
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format(format);
    return timePreview;
  };

  const getWidth = () => {
    if (isOverMainGrid) {
      const buffer = getWidthBuffer(dayIndex) + 20;
      return measurements.colWidths[dayIndex] - buffer;
    }
    // allday
    return colWidths[dayIndex] - 15;
  };

  /* Size */
  const height = getHeight();
  const width = getWidth();

  const { x: snappedX, y: snappedY } = snapToGrid(
    x,
    y,
    measurements,
    gridScrollRef.current?.scrollTop || 0
  );

  return (
    <div style={layerStyles}>
      <div style={getItemStyles({ x: snappedX, y: snappedY })}>
        <StyledGridEventPreview
          className={"active"}
          duration={1}
          height={height}
          priority={event.priority}
          role="button"
          tabIndex={0}
          width={width}
        >
          <Flex alignItems={AlignItems.CENTER} flexWrap={FlexWrap.WRAP}>
            <Text size="m" role="textbox">
              {event.title}
            </Text>

            {isOverMainGrid && (
              <>
                <SpaceCharacter />
                <Text size="s">{getTimePreview()}</Text>
              </>
            )}
          </Flex>
        </StyledGridEventPreview>
      </div>
    </div>
  );
});

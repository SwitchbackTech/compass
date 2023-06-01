import React, { FC, memo } from "react";
import { DAY_COMPACT, DAY_HOUR_MIN_M } from "@core/constants/date.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getWidthBuffer } from "@web/common/utils/grid.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/LeftSidebar/SomedaySection/SomedayEvents/styled";
import { EVENT_ALLDAY_HEIGHT } from "@web/views/Calendar/layout.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { SpaceCharacter } from "@web/components/SpaceCharacter";

import { getItemStyles, layerStyles, StyledGridEventPreview } from "./styled";

export interface Props {
  dateCalcs: DateCalcs;
  dayIndex: number;
  event: Schema_GridEvent;
  isOverAllDayRow: boolean;
  isOverMainGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: { x: number; y: number };
  startOfView: WeekProps["component"]["startOfView"];
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

  return (
    <div style={layerStyles}>
      <div style={getItemStyles({ x: 0, y: 0 }, { x, y })}>
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
            <Text size={12} role="textbox">
              {event.title}
            </Text>

            {isOverMainGrid && (
              <>
                <SpaceCharacter />
                <Text size={10}>{getTimePreview()}</Text>
              </>
            )}
          </Flex>
        </StyledGridEventPreview>
      </div>
    </div>
  );
});

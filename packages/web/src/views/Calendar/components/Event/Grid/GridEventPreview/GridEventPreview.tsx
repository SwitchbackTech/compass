import { FC, memo, useCallback, useMemo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { DAY_COMPACT, DAY_HOUR_MIN_M } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import { useCursorCoordinates } from "@web/common/hooks/useCursorCoordinates";
import { getWidthBuffer } from "@web/common/utils/grid/grid.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { selectRowCount } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { snapToGrid } from "@web/views/Calendar/components/Event/Grid/GridEventPreview/snap.grid";
import {
  StyledGridEventPreview,
  getItemStyles,
  layerStyles,
} from "@web/views/Calendar/components/Event/Grid/GridEventPreview/styled";
import { SOMEDAY_EVENT_HEIGHT } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEvent/styled";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import {
  EVENT_ALLDAY_GAP,
  EVENT_ALLDAY_HEIGHT,
  GRID_X_START,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";

interface Props {
  dateCalcs: DateCalcs;
  event: Schema_Event;
  isOverAllDayRow: boolean;
  isOverMainGrid: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  mainGridRef: Refs_Grid["mainGridRef"];
}

const _GridEventPreview: FC<Props> = ({
  dateCalcs,
  event,
  isOverAllDayRow,
  isOverMainGrid,
  measurements,
  startOfView,
  mainGridRef,
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const allDayRowCount = useAppSelector(selectRowCount);
  const { getDayNumberByX, getMinuteByY } = dateCalcs;
  const { colWidths } = measurements;
  const { x: clientX, y: clientY } = useCursorCoordinates();
  const gridX = clientX - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
  const dayIndex = getDayNumberByX(gridX);

  /* Helpers */
  const width = useMemo(() => {
    if (isOverMainGrid) {
      const buffer = getWidthBuffer(dayIndex) + 20;
      return measurements.colWidths[dayIndex] - buffer;
    }
    // allday
    return colWidths[dayIndex] - 15;
  }, [colWidths, dayIndex, isOverMainGrid, measurements.colWidths]);

  const height = useMemo(() => {
    if (isOverAllDayRow) return EVENT_ALLDAY_HEIGHT;

    const height = isOverMainGrid
      ? measurements.hourHeight
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  }, [isOverAllDayRow, isOverMainGrid, measurements.hourHeight]);

  const previewTime = useMemo(() => {
    const minutes = getMinuteByY(clientY);
    const format = isOverAllDayRow ? DAY_COMPACT : DAY_HOUR_MIN_M;
    const timePreview = startOfView
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format(format);
    return timePreview;
  }, [getMinuteByY, isOverAllDayRow, startOfView, dayIndex, clientY]);

  /* Size */

  const { x: snappedX, y: snappedY } = snapToGrid(
    clientX,
    clientY,
    measurements,
    mainGridRef.current?.scrollTop || 0,
  );

  /*
   * If we are over the all-day row, override the snapped Y so that the preview
   * is positioned directly beneath the existing events in that column. We do
   * this by calculating the row height (the same height used when rendering
   * real all-day events) and multiplying it by the number of rows that already
   * exist, then offsetting from the top of the all-day row element.
   */
  const getSnappedYForAllDay = useCallback((): number => {
    if (!measurements.allDayRow) return snappedY;

    // The top offset each row uses when rendered (see getAllDayEventPosition)
    const ROW_HEIGHT = EVENT_ALLDAY_HEIGHT + EVENT_ALLDAY_GAP;

    // Index for the new row (existing rows + 1)
    const nextRowIndex = allDayRowCount + 1;

    return measurements.allDayRow.top + ROW_HEIGHT * nextRowIndex;
  }, [allDayRowCount, measurements.allDayRow, snappedY]);

  const finalY = isOverAllDayRow ? getSnappedYForAllDay() : snappedY;

  return (
    <div style={layerStyles}>
      <div style={getItemStyles({ x: snappedX, y: finalY })}>
        <StyledGridEventPreview
          className={"active"}
          duration={1}
          height={height}
          priority={event.priority || Priorities.UNASSIGNED}
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
                <Text size="s">{previewTime}</Text>
              </>
            )}
          </Flex>
        </StyledGridEventPreview>
      </div>
    </div>
  );
};

export const GridEventPreview = memo(_GridEventPreview);

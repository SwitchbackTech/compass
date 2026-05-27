import { type FC } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { CalendarGrid } from "@web/common/calendar-grid/components/CalendarGrid";
import { AllDayRow } from "@web/views/Week/components/Grid/AllDayRow/AllDayRow";
import { EdgeNavigationIndicators } from "@web/views/Week/components/Grid/MainGrid/EdgeNavigationIndicators/EdgeNavigationIndicators";
import { MainGrid } from "@web/views/Week/components/Grid/MainGrid/MainGrid";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useDragEdgeNavigation } from "@web/views/Week/hooks/grid/useDragEdgeNavigation";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { GRID_Y_START } from "@web/views/Week/layout.constants";

interface Props {
  dateCalcs: DateCalcs;
  gridRefs: Refs_Grid;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Grid: FC<Props> = ({
  dateCalcs,
  gridRefs,
  measurements,
  today,
  weekProps,
}) => {
  const { allDayRef, allDayRowRef, mainGridElementRef, mainGridRef } = gridRefs;

  useDragEdgeNavigation(mainGridRef, weekProps);

  const visibleDates = weekProps.component.weekDays.map((date) => ({
    date,
    key: date.format(YEAR_MONTH_DAY_FORMAT),
  }));

  return (
    <AllDayRow
      allDayRef={allDayRef}
      allDayRowRef={allDayRowRef}
      dateCalcs={dateCalcs}
      measurements={measurements}
      weekProps={weekProps}
    >
      {({ allDayEventsLayer, allDayRowsCount, onAllDayMouseDown }) => (
        <MainGrid
          dateCalcs={dateCalcs}
          mainGridElementRef={mainGridElementRef}
          mainGridRef={mainGridRef}
          measurements={measurements}
          timedColumnsElementRef={gridRefs.timedColumnsElementRef}
          today={today}
          weekProps={weekProps}
        >
          {({ onTimedMouseDown, timedEventsLayer }) => (
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                minHeight: 0,
                position: "relative",
                width: "100%",
              }}
            >
              <CalendarGrid
                allDayEventsLayer={allDayEventsLayer}
                allDayGridOffsetTopPx={GRID_Y_START}
                allDayRowsCount={allDayRowsCount}
                gridRefs={gridRefs}
                onAllDayMouseDown={onAllDayMouseDown}
                onTimedMouseDown={onTimedMouseDown}
                timedEventsLayer={timedEventsLayer}
                today={today}
                visibleDates={visibleDates}
              />
              <EdgeNavigationIndicators />
            </div>
          )}
        </MainGrid>
      )}
    </AllDayRow>
  );
};

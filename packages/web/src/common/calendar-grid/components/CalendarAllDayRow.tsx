import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
} from "react";
import styled from "styled-components";
import {
  CALENDAR_EVENT_WIDTH_MINIMUM,
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_GRID_PADDING_BOTTOM,
  CALENDAR_GRID_TIME_STEP,
} from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarGridVisibleDate } from "@web/common/calendar-grid/types/calendarGrid.types";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
} from "@web/common/constants/web.constants";
import { Flex } from "@web/components/Flex";

interface CalendarAllDayRowProps {
  allDayColumnsRef: RefCallback<HTMLDivElement>;
  allDayRowRef: RefCallback<HTMLDivElement>;
  columnsId?: string;
  eventsLayer: ReactNode;
  gridOffsetTopPx?: number;
  onMouseDown: MouseEventHandler<HTMLElement>;
  rowsCount?: number;
  rowId?: string;
  visibleDates: CalendarGridVisibleDate[];
}

const getAllDayRowHeight = (gridOffsetTopPx: number) => {
  const gridHeight = `100% - (${gridOffsetTopPx}px + ${CALENDAR_GRID_PADDING_BOTTOM}px)`;
  const gridRowHeight = `(${gridHeight}) / 11`;
  const interval = 60 / CALENDAR_GRID_TIME_STEP;

  return `${gridRowHeight} / ${interval}`;
};

const StyledAllDayColumns = styled.div<{ $visibleDateCount: number }>`
  display: grid;
  grid-template-columns: ${({ $visibleDateCount }) =>
    `repeat(${$visibleDateCount}, minmax(${CALENDAR_EVENT_WIDTH_MINIMUM}px, 1fr))`};
  height: 100%;
  left: ${CALENDAR_GRID_MARGIN_LEFT}px;
  position: absolute;
  top: 0;
  width: calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px);

  &::before {
    background: ${({ theme }) => theme.color.gridLine.primary};
    bottom: 0;
    content: "";
    height: 2px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
  }
`;

const StyledAllDayRow = styled(Flex)<{
  $gridOffsetTopPx: number;
  $rowsCount: number;
}>`
  flex-shrink: 0;
  height: ${({ $gridOffsetTopPx, $rowsCount }) => {
    const allDayRowHeight = getAllDayRowHeight($gridOffsetTopPx);

    return `calc(${allDayRowHeight} * 2 + ${
      $rowsCount * 2 || 1
    } * ${allDayRowHeight})`;
  }};
  position: relative;
  width: 100%;
`;

const StyledDateColumn = styled.div`
  border-left: ${({ theme }) => `1px solid ${theme.color.gridLine.primary}`};
  box-sizing: border-box;
  display: block;
  height: 100%;
  min-width: ${CALENDAR_EVENT_WIDTH_MINIMUM}px;
  position: relative;
`;

export const CalendarAllDayRow: FC<CalendarAllDayRowProps> = ({
  allDayColumnsRef,
  allDayRowRef,
  columnsId = ID_ALLDAY_COLUMNS,
  eventsLayer,
  gridOffsetTopPx = 0,
  onMouseDown,
  rowsCount = 0,
  rowId = ID_GRID_ALLDAY_ROW,
  visibleDates,
}) => (
  <StyledAllDayRow
    $gridOffsetTopPx={gridOffsetTopPx}
    $rowsCount={rowsCount}
    aria-label="All-day events"
    id={rowId}
    ref={allDayRowRef}
    role="region"
    onMouseDown={onMouseDown}
  >
    <StyledAllDayColumns
      $visibleDateCount={visibleDates.length}
      id={columnsId}
      ref={allDayColumnsRef}
    >
      {visibleDates.map(({ date, key }) => (
        <StyledDateColumn
          aria-label={date.format("dddd, MMMM D, YYYY")}
          key={key}
          role="columnheader"
        />
      ))}
    </StyledAllDayColumns>
    {eventsLayer}
  </StyledAllDayRow>
);

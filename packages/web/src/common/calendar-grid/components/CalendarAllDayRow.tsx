import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
} from "react";
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
import { type CSSVariables } from "@web/common/styles/css.types";
import { Flex } from "@web/components/Flex/Flex";

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
  <Flex
    className="relative w-full shrink-0"
    aria-label="All-day events"
    id={rowId}
    ref={allDayRowRef}
    role="region"
    onMouseDown={onMouseDown}
    style={{
      height: `calc(${getAllDayRowHeight(gridOffsetTopPx)} * 2 + ${rowsCount * 2 || 1} * ${getAllDayRowHeight(gridOffsetTopPx)})`,
    }}
  >
    <div
      className="c-calendar-all-day-columns"
      id={columnsId}
      ref={allDayColumnsRef}
      style={
        {
          "--calendar-column-count": visibleDates.length,
          "--calendar-column-min-width": `${CALENDAR_EVENT_WIDTH_MINIMUM}px`,
          "--calendar-grid-margin-left": `${CALENDAR_GRID_MARGIN_LEFT}px`,
        } as CSSVariables
      }
    >
      {visibleDates.map(({ date, key }) => (
        <div
          className="c-calendar-date-column"
          aria-label={date.format("dddd, MMMM D, YYYY")}
          key={key}
          role="columnheader"
        />
      ))}
    </div>
    {eventsLayer}
  </Flex>
);

import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
} from "react";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
} from "@web/common/constants/web.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import {
  CALENDAR_EVENT_WIDTH_MINIMUM,
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_GRID_PADDING_BOTTOM,
  CALENDAR_GRID_TIME_STEP,
} from "@web/layout/calendar-grid/calendarGrid.constants";
import { type CalendarGridVisibleDate } from "@web/layout/calendar-grid/types/calendarGrid.types";

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
  <div
    className="relative flex w-full shrink-0 items-start"
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
      className="absolute top-0 left-[var(--calendar-grid-margin-left)] grid h-full w-[calc(100%_-_var(--calendar-grid-margin-left))] grid-cols-[repeat(var(--calendar-column-count),minmax(var(--calendar-column-min-width),1fr))] before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 before:bg-grid-line-primary before:content-['']"
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
      {visibleDates.map(({ date, key, surfaceLabel }) => (
        <div
          className="relative box-border block h-full min-w-[var(--calendar-column-min-width)] border-grid-line-primary border-l"
          aria-label={surfaceLabel ?? date.format("dddd, MMMM D, YYYY")}
          key={key}
          role="columnheader"
        />
      ))}
    </div>
    {eventsLayer}
  </div>
);

import {
  type FC,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader/AbsoluteOverflowLoader";
import {
  type CalendarGridRefs,
  type CalendarGridVisibleDate,
} from "@web/layout/calendar-grid/types/calendarGrid.types";
import { CalendarAllDayRow } from "./CalendarAllDayRow";
import { CalendarTimedGrid } from "./CalendarTimedGrid";

export interface CalendarGridProps {
  allDayEventsLayer: ReactNode;
  allDayGridOffsetTopPx?: number;
  allDayRowsCount?: number;
  gridRefs: CalendarGridRefs;
  /** First load only. Background refetches keep the grid interactive. */
  isLoadingEvents?: boolean;
  onAllDayMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  onTimedMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  timedEventsLayer: ReactNode;
  today: Dayjs;
  visibleDates: CalendarGridVisibleDate[];
}

export const CalendarGrid: FC<CalendarGridProps> = ({
  allDayEventsLayer,
  allDayGridOffsetTopPx = 0,
  allDayRowsCount = 0,
  gridRefs,
  isLoadingEvents = false,
  onAllDayMouseDown,
  onTimedMouseDown,
  timedEventsLayer,
  today,
  visibleDates,
}) => (
  <div className="relative flex min-h-0 w-full flex-1 flex-col">
    <CalendarAllDayRow
      allDayColumnsRef={gridRefs.allDayRef}
      allDayRowRef={gridRefs.allDayRowRef}
      eventsLayer={allDayEventsLayer}
      gridOffsetTopPx={allDayGridOffsetTopPx}
      onMouseDown={onAllDayMouseDown}
      rowsCount={allDayRowsCount}
      visibleDates={visibleDates}
    />
    <CalendarTimedGrid
      eventsLayer={timedEventsLayer}
      onMouseDown={onTimedMouseDown}
      timedColumnsRef={gridRefs.timedColumnsElementRef}
      timedGridRef={gridRefs.mainGridElementRef}
      today={today}
      visibleDates={visibleDates}
    />
    {isLoadingEvents && (
      // pointer-events-none: the loader is informational and covers the whole
      // grid, so without it the overlay swallows the mousedown that
      // drag-creates an event for as long as the first fetch runs.
      <AbsoluteOverflowLoader
        aria-label="Loading events"
        className="pointer-events-none [&>div]:my-0"
        role="status"
      />
    )}
  </div>
);

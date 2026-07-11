import {
  type FC,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { type Dayjs } from "@core/util/date/dayjs";
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
  </div>
);

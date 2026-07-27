import {
  type FC,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader/AbsoluteOverflowLoader";
import {
  type GridRefs,
  type GridVisibleDate,
} from "@web/grid/types/grid.types";
import { AllDayGridRow } from "./AllDayGridRow";
import { TimedGrid } from "./TimedGrid";

export interface EventGridProps {
  allDayEventsLayer: ReactNode;
  allDayGridOffsetTopPx?: number;
  allDayRowsCount?: number;
  gridRefs: GridRefs;
  /** First load only. Background refetches keep the grid interactive. */
  isLoadingEvents?: boolean;
  /** Failed fetch with nothing reliable to show — mirrors CalendarList. */
  isErrorEvents?: boolean;
  onRetryEvents?: () => void;
  onAllDayMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  onTimedMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  timedEventsLayer: ReactNode;
  today: Dayjs;
  visibleDates: GridVisibleDate[];
}

export const EventGrid: FC<EventGridProps> = ({
  allDayEventsLayer,
  allDayGridOffsetTopPx = 0,
  allDayRowsCount = 0,
  gridRefs,
  isLoadingEvents = false,
  isErrorEvents = false,
  onRetryEvents,
  onAllDayMouseDown,
  onTimedMouseDown,
  timedEventsLayer,
  today,
  visibleDates,
}) => (
  <div className="relative flex min-h-0 w-full flex-1 flex-col">
    <AllDayGridRow
      allDayColumnsRef={gridRefs.allDayRef}
      allDayRowRef={gridRefs.allDayRowRef}
      eventsLayer={allDayEventsLayer}
      gridOffsetTopPx={allDayGridOffsetTopPx}
      onMouseDown={onAllDayMouseDown}
      rowsCount={allDayRowsCount}
      visibleDates={visibleDates}
    />
    <TimedGrid
      eventsLayer={timedEventsLayer}
      onMouseDown={onTimedMouseDown}
      timedColumnsRef={gridRefs.timedColumnsElementRef}
      timedGridRef={gridRefs.mainGridElementRef}
      today={today}
      visibleDates={visibleDates}
    />
    {/* Sibling overlay, not an outline on TimedGrid itself, so the ring isn't clipped by overflow-y-auto and includes the all-day row above. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden outline outline-1 outline-[var(--accent)] peer-focus-visible:block"
      data-testid="grid-focus-indicator"
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
    {isErrorEvents && !isLoadingEvents && (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 px-4">
        <div className="flex items-center gap-3 text-sm">
          <p className="text-error">Couldn't load events.</p>
          {onRetryEvents ? (
            <button
              className="c-focus-ring rounded-xs px-1.5 py-0.5 text-accent hover:brightness-110"
              onClick={onRetryEvents}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    )}
  </div>
);

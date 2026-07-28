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
  /** First load, or refetch after a failed load (Retry). */
  isLoadingEvents?: boolean;
  /** Failed fetch with nothing reliable to show. */
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
        className="pointer-events-none bg-background [&>div]:my-0"
        role="status"
      />
    )}{" "}
    {isErrorEvents && !isLoadingEvents && (
      <div
        aria-live="assertive"
        className="absolute inset-0 z-20 flex items-center justify-center bg-background px-4"
        role="alert"
      >
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-md border border-border-strong bg-surface-raised px-5 py-4 text-center shadow-[0_8px_24px_var(--color-shadow-default)]">
          <p className="text-sm text-text">Couldn't load events.</p>
          {onRetryEvents ? (
            <button
              className="c-focus-ring rounded-sm bg-accent px-3 py-1.5 text-on-accent text-sm hover:bg-accent-hover"
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

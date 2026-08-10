import {
  type FC,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { ZIndex } from "@web/common/constants/web.constants";
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
  /**
   * Google import is in progress and the visible range has no events yet —
   * show expectation-setting copy instead of a blank grid (non-blocking).
   */
  isImportingEmpty?: boolean;
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
  isImportingEmpty = false,
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
      // First load: keep grid chrome (hour lines, columns) visible under a
      // small non-blocking spinner — no opaque fill or blur. Retry after
      // error stays opaque and blocks the grid so Retry cannot click through.
      <AbsoluteOverflowLoader
        aria-label="Loading events"
        className={
          isErrorEvents
            ? "bg-background [&>div]:my-0"
            : "pointer-events-none backdrop-blur-none [&>div]:my-0 [&>div]:h-10 [&>div]:w-10 [&>div]:border-2"
        }
        role="status"
        style={{ zIndex: ZIndex.MAX }}
      />
    )}
    {isImportingEmpty && !isLoadingEvents && !isErrorEvents && (
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-4"
        role="status"
        style={{ zIndex: ZIndex.MAX }}
      >
        <p className="max-w-sm text-center text-sm text-text-muted">
          Importing from Google. Larger calendars can take a few minutes.
        </p>
      </div>
    )}
    {isErrorEvents && !isLoadingEvents && (
      <div
        className="absolute inset-0 flex items-center justify-center bg-background px-4"
        style={{ zIndex: ZIndex.MAX }}
      >
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-md border border-border-strong bg-surface-raised px-5 py-4 text-center shadow-[0_8px_24px_var(--color-shadow-default)]">
          <p className="text-sm text-text" role="alert">
            Couldn&apos;t load events.
          </p>
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

/** First load, or a Retry refetch after failure — both should show the loader. */
export function isEventGridLoading(
  isPending: boolean,
  isError: boolean,
  isFetching: boolean,
): boolean {
  return isPending || (isError && isFetching);
}

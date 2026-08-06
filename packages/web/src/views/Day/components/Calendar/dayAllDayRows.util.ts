import { type GridEvent } from "@web/common/types/web.event.types";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";

/**
 * Day view columns are calendars on the same date. Week-style row assignment
 * treats every same-day event as overlapping, so N calendars' all-day events
 * stack into N vertical rows. Re-assign rows per calendar column so events in
 * different columns can share a row and the all-day strip stays short.
 *
 * Rows are keyed by input index (not `_id`) so untitled drafts without an id
 * still keep their stacked row.
 */
export const assignDayAllDayEventRows = (
  events: GridEvent[],
  getColumnIndex: (event: GridEvent) => number,
): { allDayEvents: GridEvent[]; rowsCount: number } => {
  if (events.length === 0) {
    return { allDayEvents: events, rowsCount: 1 };
  }

  const columnIndexes = events.map((event) => getColumnIndex(event));
  const eventsByColumn = new Map<
    number,
    { event: GridEvent; index: number }[]
  >();

  events.forEach((event, index) => {
    const columnIndex = columnIndexes[index]!;
    const columnEvents = eventsByColumn.get(columnIndex) ?? [];
    columnEvents.push({ event, index });
    eventsByColumn.set(columnIndex, columnEvents);
  });

  const rowByIndex = new Map<number, number>();
  let rowsCount = 1;

  for (const columnEvents of eventsByColumn.values()) {
    const { allDayEvents: positioned } = assignEventsToRow(
      columnEvents.map(({ event }) => event),
    );

    columnEvents.forEach(({ index }, columnOrder) => {
      const row = positioned[columnOrder]?.row ?? columnOrder + 1;
      rowByIndex.set(index, row);
      rowsCount = Math.max(rowsCount, row);
    });
  }

  return {
    allDayEvents: events.map((event, index) => ({
      ...event,
      row: rowByIndex.get(index) ?? 1,
    })),
    rowsCount,
  };
};

import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type EventWithDates } from "@web/common/utils/event/event.util";
import { findRowForEvent } from "./grid.util";

export const assignEventsToRow = (
  allDayEvents: EventWithDates[],
): {
  rowsCount: number;
  allDayEvents: GridEvent[];
} => {
  const rows: number[][] = [];
  // makes copy of all event objects to allow for adding a 'row' field
  // can likely be optimized using immer's `produce` and `draft`
  const orderedAllDayEvents = allDayEvents?.map((e) => ({
    ...e,
  })) as GridEvent[];

  orderedAllDayEvents?.forEach((event) => {
    const eventDays = _getEventDayNumbers(event);
    const rowNum = findRowForEvent(eventDays, rows);

    if (rowNum !== null) {
      // add to existing row
      rows[rowNum] = [...rows[rowNum], ...eventDays];
      event["row"] = rowNum + 1;
      return;
    }

    // add to new row. The first event lands here too: no rows exist yet, so
    // nothing can fit it.
    rows.push(eventDays);
    event["row"] = rows.length;
  });

  return { rowsCount: rows.length, allDayEvents: orderedAllDayEvents };
};

const _getEventDayNumbers = (event: EventWithDates) => {
  const startDayOfYear = dayjs(event.startDate).dayOfYear();
  const endDayOfYear = dayjs(event.endDate).dayOfYear();
  const eventDays = _range(startDayOfYear, endDayOfYear);

  /*
    removes the last number so that it doesn't overlap with neighboring events
    example:
      - an event on July 4 is represented as yyyy-07-04 - yyyy-07-05
        - its original day numbers are: [85, 86]
      - this will cause it to erroneously overlap with an event on July 5
        - because July 5 day numbers will be [86, 87]
        - 86 is shared between both days
      - removing the second number fixes this, because:
        - July 4 is represented as [85]
        - July 5 is [86]
        - There is no overlap, so they can fit on the same row
  */
  if (eventDays.length > 1) {
    eventDays.pop();
  }
  return eventDays;
};

const _range = (start: number, end: number) => {
  // An end before the start means the span crosses New Year, so count on
  // past the end of the year instead: eg. an end of 2 becomes 367/8.
  const last = end < start ? start + end : end;

  return Array(last - start + 1)
    .fill(null)
    .map((_, idx) => start + idx);
};

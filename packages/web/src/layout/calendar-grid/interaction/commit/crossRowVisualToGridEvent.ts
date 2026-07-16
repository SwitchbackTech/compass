import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { CROSS_ROW_TIMED_DURATION_MIN } from "../math/crossRowDrag";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import { type TimedDragVisual } from "../model/TimedDragVisual";

/**
 * All-day -> timed. Lossy in reverse: an all-day event has no time of day, so
 * the start comes from where it was dropped (snapped to the grid's step) and
 * the length from a fixed default. A multi-day span collapses to that single
 * block on the drop column - there is no honest way to keep a 5-day span as a
 * timed event, and the pointer is the only signal for which day was meant.
 *
 * `isAllDay` flips here; the coordinator reads it to pick the allDay/timed
 * schedule kind, so the whole conversion rides the normal mutation path.
 */
export const allDayDragVisualToTimedGridEvent = (
  event: GridEvent,
  visual: AllDayDragVisual,
): GridEvent => {
  const day = dayjs(visual.dayDate).startOf("day");
  const startMinutes = visual.timedStartMinutes ?? 0;

  return {
    ...event,
    endDate: day
      .add(startMinutes + CROSS_ROW_TIMED_DURATION_MIN, "minutes")
      .format(),
    isAllDay: false,
    startDate: day.add(startMinutes, "minutes").format(),
  };
};

/**
 * Timed -> all-day. Time of day is discarded and the event becomes a one-day
 * all-day event on the column it was dropped on (absolute, matching the timed
 * drag's own day semantics). All-day dates are date-only with an *exclusive*
 * end, so a single day ends on the following date - see assign.row.ts.
 */
export const timedDragVisualToAllDayGridEvent = (
  event: GridEvent,
  visual: TimedDragVisual,
): GridEvent => {
  const day = dayjs(visual.dayDate);

  return {
    ...event,
    endDate: day.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
    isAllDay: true,
    startDate: day.format(YEAR_MONTH_DAY_FORMAT),
  };
};

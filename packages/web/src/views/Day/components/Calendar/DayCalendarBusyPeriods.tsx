import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useAvailabilityQuery } from "@web/calendars/availability.query";
import { useCalendarLookup } from "@web/calendars/useCalendarLookup";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { BusyPeriodBlock } from "@web/grid/components/BusyPeriodBlock";
import { splitBusyPeriodsByDay } from "@web/grid/layout/busy-period.layout";
import { getBusyPeriodPosition } from "@web/grid/layout/event.position";
import {
  type GridMeasurements,
  type GridVisibleDate,
} from "@web/grid/types/grid.types";

const ID_GRID_BUSY_PERIODS = "busyPeriods";

interface Props {
  calendarColumnIndexById?: ReadonlyMap<string, number>;
  dateInView: Dayjs;
  measurements: GridMeasurements;
  visibleDates: GridVisibleDate[];
}

/**
 * Day-grid counterpart to MainGridBusyPeriods (packet 08 phase 4; A7):
 * renders freeBusyReader calendars' busy time as inert decoration in the day
 * timed grid, mounted beside DayCalendarTimedEventsLayer. Matches
 * DayCalendarGrid's own event-range convention
 * (dateInView.startOf/endOf("day").utc(true).format()) so the availability
 * range agrees with the day events query. Renders nothing while the
 * availability query is loading/errored/disabled.
 */
export const DayCalendarBusyPeriodsLayer = ({
  calendarColumnIndexById,
  dateInView,
  measurements,
  visibleDates,
}: Props) => {
  const start = useMemo(
    () => dateInView.startOf("day").utc(true).format(),
    [dateInView],
  );
  const end = useMemo(
    () => dateInView.endOf("day").utc(true).format(),
    [dateInView],
  );
  const { data } = useAvailabilityQuery({ start, end });
  const calendarLookup = useCalendarLookup();
  const segments = useMemo(
    () => splitBusyPeriodsByDay(data?.busyPeriods ?? [], visibleDates),
    [data, visibleDates],
  );

  return (
    <div id={ID_GRID_BUSY_PERIODS}>
      {segments.map((segment) => {
        const columnIndex = calendarColumnIndexById?.get(segment.calendarId);
        if (calendarColumnIndexById && columnIndex === undefined) return null;

        const position = getBusyPeriodPosition(segment, {
          columnIndex,
          measurements,
          visibleDates,
        });
        const calendarName =
          calendarLookup.get(segment.calendarId)?.name ?? "Calendar";

        return (
          <BusyPeriodBlock
            ariaLabel={`Busy, ${calendarName} calendar, ${getTimesLabel(segment.start, segment.end)}`}
            key={segment.key}
            position={position}
          />
        );
      })}
    </div>
  );
};

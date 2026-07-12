import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useAvailabilityQuery } from "@web/calendars/availability.query";
import { useCalendarLookup } from "@web/calendars/useCalendarLookup";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { CalendarBusyPeriodBlock } from "@web/layout/calendar-grid/components/CalendarBusyPeriodBlock";
import { splitBusyPeriodsByDay } from "@web/layout/calendar-grid/layout/calendarBusyPeriodLayout";
import { getCalendarBusyPeriodPosition } from "@web/layout/calendar-grid/layout/calendarEventPosition";
import {
  type CalendarGridMeasurements,
  type CalendarGridVisibleDate,
} from "@web/layout/calendar-grid/types/calendarGrid.types";

const ID_GRID_BUSY_PERIODS = "busyPeriods";

interface Props {
  dateInView: Dayjs;
  measurements: CalendarGridMeasurements;
  visibleDates: CalendarGridVisibleDate[];
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
        const position = getCalendarBusyPeriodPosition(segment, {
          measurements,
          visibleDates,
        });
        const calendarName =
          calendarLookup.get(segment.calendarId)?.name ?? "Calendar";

        return (
          <CalendarBusyPeriodBlock
            ariaLabel={`Busy, ${calendarName} calendar, ${getTimesLabel(segment.start, segment.end)}`}
            key={segment.key}
            position={position}
          />
        );
      })}
    </div>
  );
};

import { useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { useAvailabilityQuery } from "@web/calendars/availability.query";
import { useCalendarLookup } from "@web/calendars/useCalendarLookup";
import {
  getTimesLabel,
  toUTCOffset,
} from "@web/common/utils/datetime/web.date.util";
import { CalendarBusyPeriodBlock } from "@web/layout/calendar-grid/components/CalendarBusyPeriodBlock";
import { splitBusyPeriodsByDay } from "@web/layout/calendar-grid/layout/calendarBusyPeriodLayout";
import { getCalendarBusyPeriodPosition } from "@web/layout/calendar-grid/layout/calendarEventPosition";
import { type CalendarGridVisibleDate } from "@web/layout/calendar-grid/types/calendarGrid.types";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

const ID_GRID_BUSY_PERIODS = "busyPeriods";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

/**
 * Sibling layer to MainGridEvents rendering freeBusyReader calendars' busy
 * time as inert decoration (packet 08 phase 4; A7) - no event actions, no
 * leaked details. Queries the full week (mirrors MainGridEvents fetching the
 * whole week via useWeekEventViewModel) so the query key doesn't churn as
 * the responsive visible-day window resizes; a multi-day busy period is
 * split and clamped per visible day column by splitBusyPeriodsByDay. Renders
 * nothing while the availability query is loading/errored/disabled -
 * best-effort decoration only, never a loading state of its own.
 */
export const MainGridBusyPeriods = ({ measurements, weekProps }: Props) => {
  const { component } = weekProps;
  const start = useMemo(
    () => toUTCOffset(component.startOfView),
    [component.startOfView],
  );
  const end = useMemo(
    () => toUTCOffset(component.endOfView),
    [component.endOfView],
  );
  const { data } = useAvailabilityQuery({ start, end });
  const calendarLookup = useCalendarLookup();
  const visibleDates: CalendarGridVisibleDate[] = useMemo(
    () =>
      component.weekDays.map((date) => ({
        date,
        key: date.format(YEAR_MONTH_DAY_FORMAT),
      })),
    [component.weekDays],
  );
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

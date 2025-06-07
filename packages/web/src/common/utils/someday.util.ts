import dayjs, { Dayjs } from "dayjs";
import { RRULE } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  Schema_SomedayEventsColumn,
  Schema_SomedayGridEvent,
} from "@web/common/types/web.event.types";

export const getSomedayEventCategory = (
  event: Schema_Event,
): Categories_Event.SOMEDAY_MONTH | Categories_Event.SOMEDAY_WEEK => {
  if (!event.isSomeday) {
    throw new Error(
      `Event is not a someday event. Event: ${JSON.stringify(event)}`,
    );
  }

  const startDate = dayjs(event.startDate);
  const endDate = dayjs(event.endDate);

  const diffInDays = endDate.diff(startDate, "day");

  if (diffInDays > 7) {
    return Categories_Event.SOMEDAY_MONTH;
  }
  return Categories_Event.SOMEDAY_WEEK;
};

export const categorizeSomedayEvents = (
  somedayEvents: Schema_SomedayEventsColumn["events"],
  dates: { start: Dayjs; end: Dayjs },
): Schema_SomedayEventsColumn => {
  const start = dayjs(dates.start);
  const end = dayjs(dates.end);

  const events = Object.values(somedayEvents) as Schema_SomedayGridEvent[];
  const sortedEvents = events.sort((a, b) => a.order - b.order);

  const weekIds: string[] = [];
  const monthIds: string[] = [];

  sortedEvents.forEach((e) => {
    const eventStart = dayjs(e.startDate);
    const eventEnd = dayjs(e.endDate);
    const isWeek =
      eventStart.isBetween(start, end, null, "[]") && eventEnd.isAfter(end);
    if (isWeek) {
      const isMonthRepeat = e?.recurrence?.rule?.includes(RRULE.MONTH);
      if (!isMonthRepeat) {
        weekIds.push(e._id);
        return;
      }
    }

    const isFutureWeekThisMonth = e?.recurrence?.rule?.includes(RRULE.WEEK);
    if (isFutureWeekThisMonth) {
      return;
    }

    const monthStart = start.startOf("month");
    const monthEnd = start.endOf("month");
    const isMonth = eventStart.isBetween(monthStart, monthEnd, null, "[]");

    if (isMonth) {
      monthIds.push(e._id);
    }
  });

  const sortedData = {
    columns: {
      [COLUMN_WEEK]: {
        id: `${COLUMN_WEEK}`,
        eventIds: weekIds,
      },
      [COLUMN_MONTH]: {
        id: `${COLUMN_MONTH}`,
        eventIds: monthIds,
      },
    },
    columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
    events: somedayEvents,
  };
  return sortedData;
};

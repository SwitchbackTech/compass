import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  type Schema_GridEvent,
  type Schema_SomedayEventsColumn,
} from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { categorizeSomedayEvents } from "@web/common/utils/event/someday.event.util";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";
import { type NormalizedEventQueryData } from "./event.query.types";

const eventsFrom = (data?: NormalizedEventQueryData): Schema_Event[] =>
  data?.ids.flatMap((id) => (data.entities[id] ? [data.entities[id]] : [])) ??
  [];

const timedEventsFrom = (events: Schema_Event[]) =>
  events
    .filter(
      (event): event is EventWithDates =>
        !event.isAllDay && hasEventDates(event),
    )
    .map(assembleGridEvent);

const allDayEventsFrom = (events: Schema_Event[]) =>
  assignEventsToRow(
    events
      .filter(
        (event): event is EventWithDates =>
          Boolean(event.isAllDay) && hasEventDates(event),
      )
      .map(assembleGridEvent),
  ).allDayEvents;

const rowCountFrom = (events: Schema_GridEvent[]) => {
  const rows = events
    .map(({ row }) => row)
    .filter((row): row is number => row !== undefined);
  return rows.length === 0 ? 1 : Math.max(...rows);
};

export const deriveCalendarEventViewModel = (
  data?: NormalizedEventQueryData,
) => {
  const events = eventsFrom(data);
  const timedEvents = timedEventsFrom(events);
  const allDayEvents = allDayEventsFrom(events);
  return {
    entities: data?.entities ?? {},
    events,
    timedEvents,
    allDayEvents,
    rowCount: rowCountFrom(allDayEvents),
  };
};

export function deriveSomedayEventViewModel(
  data: NormalizedEventQueryData | undefined,
  range: { start: Dayjs; end: Dayjs },
) {
  const events =
    data?.ids.reduce<Schema_SomedayEventsColumn["events"]>((result, id) => {
      const event = data.entities[id];
      if (event) result[id] = event;
      return result;
    }, {}) ?? {};
  const categorized = categorizeSomedayEvents(events, range);
  const weekCount = categorized.columns[COLUMN_WEEK].eventIds.length;
  const monthCount = categorized.columns[COLUMN_MONTH].eventIds.length;
  return {
    events,
    orderedEvents:
      data?.ids.flatMap((id) => (events[id] ? [events[id]] : [])) ?? [],
    categorized,
    weekCount,
    monthCount,
    isAtWeeklyLimit: weekCount >= SOMEDAY_WEEKLY_LIMIT,
    isAtMonthlyLimit: monthCount >= SOMEDAY_MONTHLY_LIMIT,
  };
}

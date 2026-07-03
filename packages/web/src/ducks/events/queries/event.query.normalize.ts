import { normalize, schema } from "normalizr";
import { type Params_Events, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";

const normalizedEventSchema = () =>
  new schema.Entity("events", {}, { idAttribute: "_id" });

export const normalizeEventList = (events: Schema_Event[]) => {
  const normalized = normalize<Schema_Event>(events, [normalizedEventSchema()]);
  return {
    ids: normalized.result as string[],
    entities: normalized.entities.events ?? {},
  };
};

export const EventDateUtils = {
  adjustStartEndDate: (payload: Params_Events) => {
    if (payload.someday || payload.dontAdjustDates) return payload;
    return {
      ...payload,
      startDate: dayjs(payload.startDate).subtract(1, "day").format(),
    };
  },
  filterEventsByStartEndDate: (
    events: Schema_Event[],
    startDate: string,
    endDate: string,
  ) =>
    events.filter((event) => {
      const eventStart = dayjs(event.startDate).utc(true);
      const eventEnd = dayjs(event.endDate).utc(true);
      if (event.isAllDay) {
        return (
          eventStart.isBefore(dayjs(endDate)) &&
          eventEnd.isAfter(dayjs(startDate))
        );
      }
      return (
        eventStart.isSameOrAfter(startDate) && eventEnd.isSameOrBefore(endDate)
      );
    }),
} as const;

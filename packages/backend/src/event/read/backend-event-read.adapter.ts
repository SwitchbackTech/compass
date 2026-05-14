import { type Document, ObjectId, type WithId } from "mongodb";
import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { shapeEventRead } from "@core/event-read/event-read-shape";
import {
  type Query_Event,
  type Schema_Event,
  type Schema_Event_Core,
} from "@core/types/event.types";
import { isInstance } from "@core/util/event/event.util";
import mongoService from "@backend/common/services/mongo.service";
import { getReadCandidateFilter } from "./backend-event-read.filter";

const FALLBACK_START_DATE = "0001-01-01T00:00:00.000Z";
const FALLBACK_END_DATE = "9999-12-31T23:59:59.999Z";

export const readBackendEvents = async (
  userId: string,
  query: Query_Event,
): Promise<Schema_Event_Core[]> => {
  const filter = getReadCandidateFilter(userId, query) as Document;
  const isSomeday = query.someday === "true";

  const events = isSomeday
    ? await mongoService.event
        .find(filter)
        .limit(SOMEDAY_WEEKLY_LIMIT + SOMEDAY_MONTHLY_LIMIT)
        .sort({ startDate: 1 })
        .toArray()
    : await mongoService.event.find(filter).toArray();

  const baseEvents = await getBaseEventsForInstances(userId, events);
  const baseEventsById = Object.fromEntries(
    baseEvents.map((event) => [event._id?.toString(), event]),
  );

  const result = shapeEventRead({
    window: {
      mode: isSomeday ? "someday" : "calendar",
      startDate: query.start ?? FALLBACK_START_DATE,
      endDate: query.end ?? FALLBACK_END_DATE,
    },
    events: events.map(mapMongoEvent),
    baseEventsById,
  });

  return result.data as Schema_Event_Core[];
};

const getBaseEventsForInstances = async (
  userId: string,
  events: Array<WithId<Omit<Schema_Event, "_id">>>,
) => {
  const baseEventIds = events
    .filter(isInstance)
    .map((event) => event.recurrence?.eventId)
    .filter((eventId): eventId is string => typeof eventId === "string")
    .map((eventId) => new ObjectId(eventId));

  const baseEvents = await mongoService.event
    .find({ user: userId, _id: { $in: baseEventIds } })
    .toArray();

  return baseEvents.map(mapMongoEvent);
};

const mapMongoEvent = (
  event: WithId<Omit<Schema_Event, "_id">>,
): Schema_Event => ({
  ...event,
  _id: event._id.toString(),
});

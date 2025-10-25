import { Filter, ObjectId } from "mongodb";
import { Schema_Event } from "@core/types/event.types";

export const getReadAllFilter = (
  calendar: ObjectId,
  query: Partial<
    Pick<Schema_Event, "startDate" | "endDate" | "isSomeday"> & {
      priorities?: Schema_Event["priority"][];
    }
  >,
): Filter<Schema_Event> => {
  const { startDate, endDate, isSomeday, priorities } = query;

  // Start with basic calendar filter
  const filter: Filter<Schema_Event> = { calendar };

  // Add isSomeday condition
  filter["isSomeday"] = isSomeday;

  // Add priorities if specified
  if (priorities) filter["priorities"] = { $in: priorities };

  // Add date filters if specified
  if (startDate) filter["startDate"] = { $gte: startDate };
  if (endDate) filter["endDate"] = { $lte: endDate };

  // Exclude base events
  filter["$or"] = [
    { recurrence: { $exists: false } },
    { "recurrence.eventId": { $exists: true } },
  ];

  return filter;
};

/**
 * instanceDateMongoAggregation
 * Helps with updating instance dates using MongoDB aggregation pipeline
 * to maintain year/day/month while updating the time
 */
export const instanceDateMongoAggregation = (date: Date, field: string) => ({
  [field]: {
    $dateFromParts: {
      year: { $year: `$${field}` },
      month: { $month: `$${field}` },
      day: { $dayOfMonth: `$${field}` },
      hour: { $hour: date.getHours() },
      minute: { $minute: date.getMinutes() },
      second: { $second: date.getSeconds() },
      millisecond: { $millisecond: date.getMilliseconds() },
      timezone: {
        $dateToString: { format: "%Z", date: date.getTimezoneOffset() },
      },
    },
  },
});

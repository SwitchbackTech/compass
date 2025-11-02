import { Filter, ObjectId } from "mongodb";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";

export const baseEventExclusionFilterExpr = {
  $ne: ["$_id", "$recurrence.eventId"],
};

export const getReadAllFilter = (
  calendar: ObjectId,
  query: Partial<
    Pick<Schema_Event, "startDate" | "endDate" | "isSomeday"> & {
      priorities?: Schema_Event["priority"][];
    }
  >,
): Filter<Schema_Event> => {
  const { isSomeday = false, priorities } = query;
  const { startDate: start, endDate: end } = query;

  // Start with basic calendar filter
  const filter: Filter<Schema_Event> = { calendar };

  // Add isSomeday condition
  filter["isSomeday"] = isSomeday;

  // Add priorities if specified
  if (priorities) filter["priorities"] = { $in: priorities };

  // Add date filters if specified
  if (start && !end) filter["startDate"] = { $gte: start };
  if (end && !start) filter["endDate"] = { $lte: end };

  // account for weekly overlap
  if (start && end) {
    const startDate = dayjs(start).startOf("week").toDate();
    const endDate = dayjs(end).endOf("week").toDate();

    const inBetweenStart = {
      $and: [
        { startDate: { $gte: startDate } },
        { startDate: { $lte: endDate } },
      ],
    };

    const inBetweenEnd = {
      $and: [{ endDate: { $gte: startDate } }, { endDate: { $lte: endDate } }],
    };

    filter["$or"] = [inBetweenStart, inBetweenEnd];
  }

  // Exclude base events
  filter["$expr"] = baseEventExclusionFilterExpr;

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
      hour: { $hour: date },
      minute: { $minute: date },
      second: { $second: date },
      millisecond: { $millisecond: date },
    },
  },
});

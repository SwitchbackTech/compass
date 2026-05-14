import { type Filter } from "mongodb";
import { type Query_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";

export const getReadCandidateFilter = (
  userId: string,
  query: Query_Event,
): Filter<Omit<Schema_Event, "_id">> => {
  const { end, someday, start, priorities } = query;
  const isSomeday = someday === "true";

  const filter: Filter<Omit<Schema_Event, "_id">> = { user: userId };

  filter["isSomeday"] = isSomeday;

  if (priorities) {
    filter["priorities"] = { $in: priorities.split(",") };
  }

  if (start && end) {
    const dateFilters = getDateFilters(isSomeday, start, end);
    Object.assign(filter, dateFilters);
  }

  filter["recurrence.rule"] = { $exists: false };

  return filter;
};

const getDateFilters = (isSomeday: boolean, start: string, end: string) => {
  const { inBetweenStart, inBetweenEnd, overlapping } = getDateFilterOptions(
    start,
    end,
  );
  const isSameMonth = dayjs.utc(start).isSame(dayjs.utc(end), "month");
  const overlapOrBetween =
    isSomeday && isSameMonth
      ? [inBetweenStart, overlapping]
      : [inBetweenStart, inBetweenEnd, overlapping];

  return {
    $or: overlapOrBetween,
  };
};

const getDateFilterOptions = (start: string, end: string) => {
  const overlapping = {
    startDate: {
      $lte: start,
    },
    endDate: {
      $gte: end,
    },
  };

  const inBetweenStart = {
    $and: [
      {
        startDate: {
          $gte: start,
        },
      },
      {
        startDate: {
          $lte: end,
        },
      },
    ],
  };

  const inBetweenEnd = {
    $and: [
      {
        endDate: {
          $gte: start,
        },
      },
      {
        endDate: {
          $lte: end,
        },
      },
    ],
  };

  return { overlapping, inBetweenStart, inBetweenEnd };
};

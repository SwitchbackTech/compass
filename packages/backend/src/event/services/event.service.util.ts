import { Filter, ObjectId } from "mongodb";
import {
  Query_Event,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { isSameMonth } from "@core/util/date/date.util";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";

export const getDeleteByIdFilter = (
  event: Schema_Event_Core,
): Parameters<typeof mongoService.event.find>[0] => {
  if (!event._id) {
    throw error(
      GenericError.BadRequest,
      "Failed to get Delete Filter (missing id)",
    );
  }
  const _id = new ObjectId(event._id);
  const filter = { user: event.user };
  const isRecurring = event.recurrence?.rule;

  if (!isRecurring) {
    return { ...filter, _id };
  }

  if (!event.recurrence || !event.recurrence.eventId) {
    throw error(
      GenericError.DeveloperError,
      "Failed to get Delete Filter (missing recurrence id)",
    );
  }

  const baseOrFutureInstance = {
    ...filter,
    $or: [
      { _id },
      {
        "recurrence.eventId": event.recurrence.eventId,
        startDate: { $gt: event.startDate },
        endDate: { $gt: event.endDate },
      },
    ],
  };

  return baseOrFutureInstance;
};

export const getReadAllFilter = (
  userId: string,
  query: Query_Event,
): Filter<Omit<Schema_Event, "_id">> => {
  const { end, someday, start, priorities } = query;
  const isSomeday = someday === "true";

  // Start with basic user filter
  const filter: Filter<Omit<Schema_Event, "_id">> = { user: userId };

  // Add isSomeday condition
  filter["isSomeday"] = isSomeday;

  // Add priorities if specified
  if (priorities) {
    filter["priorities"] = { $in: priorities.split(",") };
  }

  // Add date filters if specified
  if (start && end) {
    const dateFilters = _getDateFilters(isSomeday, start, end);
    Object.assign(filter, dateFilters);
  }

  // Exclude base recurring events (those with recurrence.rule)
  filter.$and = [
    {
      $or: [
        { "recurrence.rule": { $exists: false }, isSomeday },
        { "recurrence.rule": { $exists: isSomeday }, isSomeday },
      ],
    },
  ];

  return filter;
};

const _getDateFilters = (isSomeday: boolean, start: string, end: string) => {
  const { inBetweenStart, inBetweenEnd, overlapping } = _getDateFilterOptions(
    start,
    end,
  );

  const _isSameMonth = isSameMonth(start, end);
  const overLapOrBetween =
    isSomeday && _isSameMonth
      ? [inBetweenStart, overlapping]
      : [inBetweenStart, inBetweenEnd, overlapping];

  const dateFilters = {
    $or: overLapOrBetween,
  };

  return dateFilters;
};

const _getDateFilterOptions = (start: string, end: string) => {
  // includes overlaps (starts before AND ends after dates)
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

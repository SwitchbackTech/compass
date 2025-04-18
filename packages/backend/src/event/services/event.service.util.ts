import dayjs from "dayjs";
import tz from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Filter, ObjectId } from "mongodb";
import {
  Query_Event,
  Query_Event_Update,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { isSameMonth } from "@core/util/date.utils";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

dayjs.extend(tz);
dayjs.extend(utc);

export const getCreateParams = (userId: string, event: Schema_Event_Core) => {
  const _event = {
    ...event,
    _id: undefined,
    updatedAt: new Date(),
    user: userId,
  };

  const syncToGcal = !event.isSomeday;
  const isRecurring = !event?.recurrence?.rule
    ? false
    : event.recurrence.rule.length > 0;

  return { _event, isRecurring, syncToGcal };
};

export const getDeleteByIdFilter = (
  event: Schema_Event_Core,
): Filter<object> => {
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
): Filter<Schema_Event> => {
  const { end, someday, start, priorities } = query;
  const isSomeday = someday === "true";

  // Start with basic user filter
  const filter: Filter<Schema_Event> = { user: userId };

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
  filter["recurrence.rule"] = { $exists: false };

  return filter;
};

export const getUpdateAction = (
  event: Schema_Event_Core,
  query: Query_Event_Update,
) => {
  const hasInstances = event?.recurrence?.eventId !== undefined;
  const hasRule = event?.recurrence?.rule && event.recurrence.rule.length > 0;

  if (query?.applyTo === "future") {
    if (hasInstances) {
      return "UPDATE_ALL";
    }
  }

  if (query?.applyTo === "all") {
    if (!hasInstances) {
      if (hasRule) {
        return "CREATE_INSTANCES";
      }
      return "DELETE_INSTANCES_ALL";
    } else {
      if (event?.recurrence?.rule === null) {
        return "DELETE_INSTANCES_ALL";
      }
      return "UPDATE_ALL";
    }
  }

  return "UPDATE";
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

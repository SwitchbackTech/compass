import { RRule } from "rrule";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { Filter } from "mongodb";
import { isSameMonth } from "@core/util/date.utils";
import { Query_Event, Schema_Event } from "@core/types/event.types";
import { RRULE } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GenericError } from "@backend/common/constants/error.constants";

dayjs.extend(tz);
dayjs.extend(utc);

export const assembleRecurringEvents = (event: Schema_Event) => {
  if (!event.recurrence || !event.recurrence[0]) {
    throw error(
      GenericError.DeveloperError,
      "Failed to assemble recurring events"
    );
  }

  const recurrence = event.recurrence[0] as RRULE;
  const events = _generateEvents(recurrence, event);

  return events;
};

export const getCreateParams = (userId: string, event: Schema_Event) => {
  const _event = {
    ...event,
    _id: undefined,
    updatedAt: new Date(),
    user: userId,
  };

  const syncToGcal = !event.isSomeday;
  const isRecurring = event?.recurrence?.length ?? 0 > 0;

  return { _event, isRecurring, syncToGcal };
};

export const getReadAllFilter = (
  userId: string,
  query: Query_Event
): Filter<object> => {
  const { end, someday, start, priorities } = query;
  const isSomeday = someday === "true";

  let filter = { user: userId };

  if (isSomeday) {
    filter = { ...filter, ...{ isSomeday: true } };
  } else {
    filter = { ...filter, ...{ isSomeday: false } };
  }

  if (priorities) {
    const _priorities = priorities.split(",");
    filter = { ...filter, ...{ priorities: { $in: _priorities } } };
  }

  if (start && end) {
    const dateFilters = _getDateFilters(isSomeday, start, end);
    filter = { ...filter, ...dateFilters };
  }

  return filter;
};

const _getDateFilters = (isSomeday: boolean, start: string, end: string) => {
  const { inBetweenStart, inBetweenEnd, overlapping } = _getDateFilterOptions(
    start,
    end
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

const _generateEvents = (rule: RRULE, orig: Schema_Event) => {
  if (!orig.startDate || !orig.endDate) {
    throw error(GenericError.DeveloperError, "Failed to generate events");
  }

  const nextStart = _getNextSunday(orig.startDate)
    .utc()
    .format("YYYYMMDDThhmmss");

  const _rule = `DTSTART=${nextStart}Z\n${rule}`;
  const fullRule = RRule.fromString(_rule);
  const _dates = fullRule.all();
  //++ add when adding TZ
  // const timezone = "America/Chicago";
  // const dates = _dates.map((date) => dayjs.utc(date).tz(timezone));
  const dates = _dates;

  const events = dates.map((date) => {
    const start = dayjs.utc(date);
    const end = start.add(6, "day");

    const event = {
      ...orig,
      _id: undefined,
      startDate: start.format(YEAR_MONTH_DAY_FORMAT),
      endDate: end.format(YEAR_MONTH_DAY_FORMAT),
    };

    return event;
  });

  return events;
};

const _getNextSunday = (startDate: string) => {
  const date = dayjs(startDate, YEAR_MONTH_DAY_FORMAT)
    .hour(0)
    .minute(0)
    .second(0);

  const dayOfWeek = date.day();

  let daysUntilNextSunday = (7 - dayOfWeek) % 7;
  if (daysUntilNextSunday === 0) {
    daysUntilNextSunday = 7;
  }

  const nextSunday = date.add(daysUntilNextSunday, "day");
  return nextSunday;
};

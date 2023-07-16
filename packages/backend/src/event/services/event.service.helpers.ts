import { Filter } from "mongodb";
import { Query_Event } from "@core/types/event.types";

const getDateFilters = (isSomeday: boolean, start: string, end: string) => {
  const { inBetweenStart, inBetweenEnd, overlapping } = getDateFilterOptions(
    start,
    end
  );

  // omitting inBetweenEnd allows finding somedays
  // that span two months (05-28 to 06-04)
  const overLapOrBetween = isSomeday
    ? [inBetweenStart, overlapping]
    : [inBetweenStart, inBetweenEnd, overlapping];

  const dateFilters = {
    $or: overLapOrBetween,
  };

  return dateFilters;
};

const getDateFilterOptions = (start: string, end: string) => {
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

export const getReadAllFilter = (
  userId: string,
  query: Query_Event
): Filter<object> => {
  const { end, someday, start, priorities } = query;

  let filter = { user: userId };

  if (someday) {
    filter = { ...filter, ...{ isSomeday: true } };
  } else {
    filter = { ...filter, ...{ isSomeday: false } };
  }

  if (priorities) {
    const _priorities = priorities.split(",");
    filter = { ...filter, ...{ priorities: { $in: _priorities } } };
  }

  if (start && end) {
    const isSomeday = someday === "true";
    const dateFilters = getDateFilters(isSomeday, start, end);

    filter = { ...filter, ...dateFilters };
  }

  return filter;
};

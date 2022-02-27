import { Filter } from "mongodb";

import { Query_Event } from "@core/types/event.types";

export const getReadAllFilter = (
  userId: string,
  query: Query_Event
): Filter<object> => {
  const { start, end, priorities } = query;

  let filter = { user: userId };

  if (priorities) {
    const _priorities = priorities.split(",");
    filter = { ...filter, ...{ priorities: { $in: _priorities } } };
  }

  if (start && end) {
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    // include inbetween events:
    //  start OR end date are between the date range in query
    const inBetweenOrOverlappingEvents = {
      $or: [
        {
          $and: [
            {
              startDate: {
                $gte: startIso,
              },
            },
            {
              startDate: {
                $lte: endIso,
              },
            },
          ],
        },
        {
          $and: [
            {
              endDate: {
                $gte: startIso,
              },
            },
            {
              endDate: {
                $lte: endIso,
              },
            },
          ],
        },
        // include overlaps:
        //   starts before AND ends after dates
        {
          startDate: {
            $lte: startIso,
          },
          endDate: {
            $gte: endIso,
          },
        },
      ],
    };

    filter = { ...filter, ...inBetweenOrOverlappingEvents };
  }

  return filter;
};

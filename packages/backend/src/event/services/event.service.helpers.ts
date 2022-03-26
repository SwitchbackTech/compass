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
    // include inbetween events:
    //  start OR end date are between the date range in query
    const inBetweenOrOverlappingEvents = {
      $or: [
        {
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
        },
        {
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
        },
        // include overlaps:
        //   starts before AND ends after dates
        {
          startDate: {
            $lte: start,
          },
          endDate: {
            $gte: end,
          },
        },
      ],
    };

    filter = { ...filter, ...inBetweenOrOverlappingEvents };
  }

  return filter;
};

import { Schema_Event, Query_Event } from "@core/types/event.types";
import { InsertedIds } from "@core/types/mongo.types";

export const getReadAllFilter = (userId: string, query: Query_Event) => {
  const { start, end, priorities } = query;

  let filter = { user: userId };

  if (priorities) {
    const _priorities = priorities.split(",");
    filter = { ...filter, ...{ priorities: { $in: _priorities } } };
  }

  if (start && end) {
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    // finds events whose start OR end date falls between the date range in query
    const dateFilter = {
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
      ],
    };

    filter = { ...filter, ...dateFilter };
  }

  return filter;
};

//TODO abstract for any DTO type
//TODO delete if unneeded
export const mapManyToDTO = (data: Schema_Event[], newIds: InsertedIds) => {
  //TODO change to just include a summary of events imported
  const events: Schema_Event[] = [];

  for (const [key, id] of Object.entries(newIds)) {
    const i = parseInt(key);
    events.push({ ...data[i], _id: id.toString() });
  }
  return events;
};

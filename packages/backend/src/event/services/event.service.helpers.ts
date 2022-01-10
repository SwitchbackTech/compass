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
    const dateFilter = {
      $and: [
        {
          $or: [
            {
              startDate: {
                $gte: new Date(start).toISOString(),
              },
            },
            {
              startDate: { $gte: new Date(start).toISOString() },
            },
          ],
        },
        {
          $or: [
            {
              endDate: { $lte: new Date(end).toISOString() },
            },
            { endDate: { $lte: new Date(end).toISOString() } },
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

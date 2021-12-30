import { Event_NoId, Event, Query_Event } from "@core/types/event.types";
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
              "start.dateTime": {
                $gte: new Date(start).toISOString(),
              },
            },
            {
              "start.date": { $gte: new Date(start).toISOString() },
            },
          ],
        },
        {
          $or: [
            {
              "end.dateTime": { $lte: new Date(end).toISOString() },
            },
            { "end.date": { $lte: new Date(end).toISOString() } },
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
export const mapManyToDTO = (data: Event_NoId[], newIds: InsertedIds) => {
  //TODO change to just include a summary of events imported
  const events: Event[] = [];

  for (const [key, id] of Object.entries(newIds)) {
    const i = parseInt(key);
    events.push({ ...data[i], _id: id.toString() });
  }
  return events;
};

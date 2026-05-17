import { shapeEventRead } from "@core/event-read/event-read-shape";
import { type Params_Events, type Schema_Event } from "@core/types/event.types";
import { isBase } from "@core/util/event/event.util";
import { type StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import { type Response_GetEventsSuccess } from "@web/ducks/events/event.types";

export class LocalEventReadAdapter {
  constructor(private readonly adapter: StorageAdapter) {}

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    const storedEvents = await this.adapter.getAllEvents();
    const events = storedEvents as Schema_Event[];
    const baseEventsById = Object.fromEntries(
      events
        .filter(isBase)
        .filter((event) => typeof event._id === "string")
        .map((event) => [event._id as string, event]),
    );

    const result = shapeEventRead({
      window: {
        mode: params.someday ? "someday" : "calendar",
        startDate: params.startDate,
        endDate: params.endDate,
        priorities: params.priorities,
      },
      events,
      baseEventsById,
    });

    return {
      ...result,
      page: 1,
      pageSize: result.data.length || 1,
      offset: 0,
    };
  }
}

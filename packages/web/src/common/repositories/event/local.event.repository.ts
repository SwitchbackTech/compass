import {
  CompassCoreEvent,
  Event_Core,
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import {
  deleteEventFromIndexedDB,
  loadEventsFromIndexedDB,
  saveEventToIndexedDB,
} from "@web/common/utils/storage/event.storage.util";
import { Response_GetEventsSuccess } from "@web/ducks/events/event.types";
import { EventRepository } from "./event.repository";

export class LocalEventRepository implements EventRepository {
  async create(
    event: Schema_Event | Schema_Event[] | CompassCoreEvent[],
  ): Promise<void> {
    const events = Array.isArray(event) ? event : [event];
    for (const e of events) {
      await saveEventToIndexedDB(e as Event_Core);
    }
  }

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    const events = await loadEventsFromIndexedDB(
      params.startDate,
      params.endDate,
      params.someday,
    );

    return {
      data: events as Schema_Event[],
      count: events.length,
      page: 1,
      pageSize: events.length || 1,
      offset: 0,
      startDate: params.startDate,
      endDate: params.endDate,
    };
  }

  async edit(
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void> {
    // For local repository, we just save the updated event
    // The applyTo parameter is not relevant for local storage
    await saveEventToIndexedDB(event as Event_Core);
  }

  async delete(
    _id: string,
    applyTo?: RecurringEventUpdateScope,
  ): Promise<void> {
    // For local repository, applyTo is not relevant
    await deleteEventFromIndexedDB(_id);
  }

  async reorder(order: Payload_Order[]): Promise<void> {
    // Load all events from IndexedDB, update their order, and save back
    const { compassLocalDB } = await import(
      "@web/common/utils/storage/compass-local.db"
    );
    const allEvents = await compassLocalDB.events.toArray();
    const orderMap = new Map(order.map((o) => [o._id, o.order]));

    for (const event of allEvents) {
      if (orderMap.has(event._id!)) {
        event.order = orderMap.get(event._id!);
        await saveEventToIndexedDB(event);
      }
    }
  }
}

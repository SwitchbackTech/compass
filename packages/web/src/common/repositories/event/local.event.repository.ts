import {
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
import { EventRepository } from "./event.repository.interface";

export class LocalEventRepository implements EventRepository {
  async create(event: Schema_Event | Schema_Event[]): Promise<void> {
    const events = Array.isArray(event) ? event : [event];
    console.log(
      "[LocalEventRepository.create] Saving events to IndexedDB:",
      events.map((e) => ({
        _id: e._id,
        title: e.title,
        isSomeday: e.isSomeday,
        startDate: e.startDate,
      })),
    );

    // Track errors for individual event saves
    const errors: Array<{ event: Schema_Event; error: unknown }> = [];

    for (const e of events) {
      try {
        await saveEventToIndexedDB(e as Event_Core);
      } catch (error) {
        console.error(
          "[LocalEventRepository] Failed to save event:",
          e._id,
          error,
        );
        errors.push({ event: e, error });
      }
    }

    // If any saves failed, throw aggregate error
    if (errors.length > 0) {
      throw new Error(
        `Failed to save ${errors.length} of ${events.length} events`,
      );
    }

    console.log("[LocalEventRepository.create] All events saved successfully");
  }

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    console.log(
      "[LocalEventRepository.get] Loading from IndexedDB with params:",
      {
        startDate: params.startDate,
        endDate: params.endDate,
        someday: params.someday,
      },
    );

    const events = await loadEventsFromIndexedDB(
      params.startDate,
      params.endDate,
      params.someday,
    );

    console.log(
      "[LocalEventRepository.get] Loaded events:",
      events.map((e) => ({
        _id: e._id,
        title: e.title,
        isSomeday: e.isSomeday,
        startDate: e.startDate,
      })),
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

    // Track errors for individual event saves
    const errors: Array<{ eventId: string; error: unknown }> = [];

    for (const event of allEvents) {
      if (orderMap.has(event._id!)) {
        event.order = orderMap.get(event._id!);
        try {
          await saveEventToIndexedDB(event);
        } catch (error) {
          console.error(
            "[LocalEventRepository] Failed to reorder event:",
            event._id,
            error,
          );
          errors.push({ eventId: event._id!, error });
        }
      }
    }

    // If any saves failed, throw aggregate error
    if (errors.length > 0) {
      throw new Error(`Failed to reorder ${errors.length} events`);
    }
  }
}

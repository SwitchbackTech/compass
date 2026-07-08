import {
  type Event_Core,
  type Params_Events,
  type Payload_Order,
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { getOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { preserveLocalEventMarker } from "@web/common/storage/types/local-event.types";
import { type Response_GetEventsSuccess } from "@web/events/event.types";
import { type EventRepository } from "./event.repository.types";

/**
 * Local event repository implementation using the offline data store.
 *
 * This repository delegates all storage operations to the OfflineDataStore,
 * making it independent of the underlying storage technology.
 */
export class LocalEventRepository implements EventRepository {
  private get store() {
    return getOfflineDataStore();
  }

  async create(event: Schema_Event | Schema_Event[]): Promise<void> {
    const events = Array.isArray(event) ? event : [event];

    // Track errors for individual event saves
    const errors: Array<{ event: Schema_Event; error: unknown }> = [];

    for (const e of events) {
      try {
        await this.store.putEvent(e as Event_Core);
      } catch (error) {
        errors.push({ event: e, error });
      }
    }

    // If any saves failed, throw aggregate error
    if (errors.length > 0) {
      throw new Error(
        `Failed to save ${errors.length} of ${events.length} events`,
      );
    }
  }

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    const events = await this.store.getEvents(
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
    _params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void> {
    const existingEvent = (await this.store.getAllEvents()).find(
      (storedEvent) => storedEvent._id === _id,
    );
    const eventToSave = preserveLocalEventMarker(
      existingEvent,
      event as Event_Core,
    );

    await this.store.putEvent(eventToSave);
  }

  async delete(
    _id: string,
    _applyTo?: RecurringEventUpdateScope,
  ): Promise<void> {
    // For local repository, applyTo is not relevant
    await this.store.deleteEvent(_id);
  }

  async reorder(order: Payload_Order[]): Promise<void> {
    await this.store.updateEventOrders(order);
  }
}

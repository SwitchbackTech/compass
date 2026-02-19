import {
  Event_Core,
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { getStorageAdapter } from "@web/common/storage/adapter";
import { Response_GetEventsSuccess } from "@web/ducks/events/event.types";
import { EventRepository } from "./event.repository.interface";

/**
 * Local event repository implementation using the storage adapter.
 *
 * This repository delegates all storage operations to the StorageAdapter,
 * making it independent of the underlying storage technology.
 */
export class LocalEventRepository implements EventRepository {
  private get adapter() {
    return getStorageAdapter();
  }

  async create(event: Schema_Event | Schema_Event[]): Promise<void> {
    const events = Array.isArray(event) ? event : [event];

    // Track errors for individual event saves
    const errors: Array<{ event: Schema_Event; error: unknown }> = [];

    for (const e of events) {
      try {
        await this.adapter.putEvent(e as Event_Core);
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
    const events = await this.adapter.getEvents(
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void> {
    // For local repository, we just save the updated event
    // The applyTo parameter is not relevant for local storage
    await this.adapter.putEvent(event as Event_Core);
  }

  async delete(
    _id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _applyTo?: RecurringEventUpdateScope,
  ): Promise<void> {
    // For local repository, applyTo is not relevant
    await this.adapter.deleteEvent(_id);
  }

  async reorder(order: Payload_Order[]): Promise<void> {
    const allEvents = await this.adapter.getAllEvents();
    const orderMap = new Map(order.map((o) => [o._id, o.order]));

    // Track errors for individual event saves
    const errors: Array<{ eventId: string; error: unknown }> = [];

    for (const event of allEvents) {
      const eventId = event._id;
      if (eventId && orderMap.has(eventId)) {
        // Cast to Schema_Event which includes order property
        const eventWithOrder = event as unknown as Schema_Event;
        eventWithOrder.order = orderMap.get(eventId);
        try {
          await this.adapter.putEvent(event);
        } catch (error) {
          errors.push({ eventId, error });
        }
      }
    }

    // If any saves failed, throw aggregate error
    if (errors.length > 0) {
      throw new Error(`Failed to reorder ${errors.length} events`);
    }
  }
}

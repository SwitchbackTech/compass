import {
  type Event_Core,
  type Params_Events,
  type Payload_Order,
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { getStorageAdapter } from "@web/common/storage/adapter/adapter";
import {
  type LocalStoredEvent,
  preserveLocalEventMarker,
} from "@web/common/storage/types/local-event.types";
import { type Response_GetEventsSuccess } from "@web/ducks/events/event.types";
import { type EventRepository } from "./event.repository.interface";

const hasValidOrder = (event: Pick<Schema_Event, "order">): boolean =>
  typeof event.order === "number" && !Number.isNaN(event.order);

const sortBySomedayOrder = (a: LocalStoredEvent, b: LocalStoredEvent) => {
  const orderDifference =
    (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDifference !== 0) return orderDifference;

  return (a._id ?? "").localeCompare(b._id ?? "");
};

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
    const orderedEvents = params.someday
      ? await this.repairMissingSomedayOrders(events)
      : events;

    return {
      data: orderedEvents as Schema_Event[],
      count: orderedEvents.length,
      page: 1,
      pageSize: orderedEvents.length || 1,
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
    const existingEvent = (await this.adapter.getAllEvents()).find(
      (storedEvent) => storedEvent._id === _id,
    );
    const eventToSave = preserveLocalEventMarker(
      existingEvent,
      event as Event_Core,
    );

    await this.adapter.putEvent(eventToSave);
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

  private async repairMissingSomedayOrders(
    events: LocalStoredEvent[],
  ): Promise<LocalStoredEvent[]> {
    const usedOrders = new Set<number>();

    events.forEach((event) => {
      if (hasValidOrder(event)) {
        usedOrders.add(event.order as number);
      }
    });

    let nextOrder = 0;
    const repairedEvents: LocalStoredEvent[] = [];

    for (const event of events) {
      if (hasValidOrder(event)) {
        repairedEvents.push(event);
        continue;
      }

      while (usedOrders.has(nextOrder)) {
        nextOrder += 1;
      }

      const repairedEvent = { ...event, order: nextOrder };
      usedOrders.add(nextOrder);
      repairedEvents.push(repairedEvent);
      await this.adapter.putEvent(repairedEvent);
    }

    return repairedEvents.sort(sortBySomedayOrder);
  }
}

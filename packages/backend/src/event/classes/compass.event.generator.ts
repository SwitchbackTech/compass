import { ClientSession, Filter, ObjectId, WithId } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  CompassEvent,
  CompassEventSchema,
  EventUpdateSchema,
  Event_Core,
  RecurringEventUpdateScope,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { parseCompassEventDate } from "@core/util/event/event.util";
import mongoService from "@backend/common/services/mongo.service";
import { CompassEventRRule } from "@backend/event/classes/compass.event.rrule";

export class CompassEventFactory {
  private static async findCompassEvent(
    { eventId, userId: user }: Pick<CompassEvent, "userId" | "eventId">,
    session?: ClientSession,
    throwIfNotFound = true,
  ): Promise<WithId<Omit<Schema_Event, "_id">> | null> {
    const _id = new ObjectId(eventId);
    const filter: Filter<Omit<Schema_Event, "_id">> = { _id, user };

    const event = await mongoService.event.findOne(filter, { session });

    if (throwIfNotFound && !event) {
      throw new Error(`Compass event not found for id: ${eventId}`);
    }

    return event;
  }

  private static async findCompassBaseAndInstanceEvent(
    event: Pick<CompassEvent, "userId" | "eventId">,
    session?: ClientSession,
  ): Promise<{
    baseEvent: WithId<Omit<Schema_Event_Recur_Base, "_id">>;
    instanceEvent: WithId<Omit<Schema_Event_Recur_Instance, "_id">>;
  }> {
    const { userId } = event;

    // get instance event or throw
    const instanceEvent = await CompassEventFactory.findCompassEvent(
      event,
      session,
    );

    const baseEventId = instanceEvent?.recurrence?.eventId?.toString();

    if (!baseEventId) throw new Error("event is not a recurring instance");

    // get base event in series or throw
    const baseEvent = await CompassEventFactory.findCompassEvent(
      { userId, eventId: baseEventId },
      session,
    );

    return {
      baseEvent: baseEvent as WithId<Omit<Schema_Event_Recur_Base, "_id">>,
      instanceEvent: instanceEvent as WithId<
        Omit<Schema_Event_Recur_Instance, "_id">
      >,
    };
  }

  private static async genThisAndFollowingEvents(
    event: CompassEvent,
    session?: ClientSession,
  ): Promise<CompassEvent[]> {
    const { baseEvent, instanceEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(event, session);

    const rruleOldSeries = new CompassEventRRule(baseEvent, {
      until: parseCompassEventDate(instanceEvent.startDate!)
        .subtract(1, baseEvent.isAllDay ? "day" : "milliseconds")
        .toDate(),
    });

    const baseEventId = baseEvent._id.toString();

    const compassBaseEventWithUntil: CompassEvent = {
      ...event,
      eventId: baseEventId,
      payload: { ...rruleOldSeries.base(), _id: baseEventId } as Event_Core & {
        recurrence: never;
      },
    };

    const payload = EventUpdateSchema.parse(event.payload);

    delete payload.recurrence?.eventId;

    const rruleNewSeries = new CompassEventRRule({
      ...MapEvent.removeIdentifyingData(instanceEvent),
      ...(payload as Schema_Event_Recur_Base),
      _id: instanceEvent._id,
    });

    const newBase = rruleNewSeries.base();

    // new series
    const compassEvent: CompassEvent = {
      ...event,
      payload: { ...newBase, _id: newBase._id.toString() } as Event_Core & {
        recurrence: never;
      },
    };

    return [compassBaseEventWithUntil, compassEvent];
  }

  private static async genAllEvents(
    event: CompassEvent,
    session?: ClientSession,
  ): Promise<CompassEvent[]> {
    const { baseEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(event, session);

    const eventId = baseEvent._id.toString();
    const payload = EventUpdateSchema.parse(event.payload);

    delete payload.startDate;
    delete payload.endDate;
    delete payload.recurrence?.eventId;

    const compassEvent: CompassEvent = {
      ...event,
      eventId,
      payload: { ...baseEvent, ...payload, _id: eventId } as Event_Core & {
        recurrence: never;
      },
    };

    return [compassEvent];
  }

  private static async genThisEvent(
    event: CompassEvent,
  ): Promise<CompassEvent[]> {
    const payload = event.payload as Schema_Event;
    const hasRRule = Array.isArray(payload.recurrence?.rule);
    const hasRecurringBase = !!payload.recurrence?.eventId;

    if (hasRRule && hasRecurringBase) delete payload.recurrence?.rule;

    return Promise.resolve([event]);
  }

  static async generateEvents(
    _event: CompassEvent,
    session?: ClientSession,
  ): Promise<CompassEvent[]> {
    const event = CompassEventSchema.parse(_event);

    switch (event.applyTo) {
      case RecurringEventUpdateScope.ALL_EVENTS:
        return CompassEventFactory.genAllEvents(event, session);
      case RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS:
        return CompassEventFactory.genThisAndFollowingEvents(event, session);
      case RecurringEventUpdateScope.THIS_EVENT:
      default:
        return CompassEventFactory.genThisEvent(event);
    }
  }
}

import { ClientSession, Filter, ObjectId, WithId } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  CompassAllEvents,
  CompassEvent,
  CompassEventSchema,
  CompassThisAndFollowingEvent,
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
    eventId: string,
    user: string,
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
    eventId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<{
    baseEvent: WithId<Omit<Schema_Event_Recur_Base, "_id">>;
    instanceEvent: WithId<Omit<Schema_Event_Recur_Instance, "_id">>;
  }> {
    // get instance event or throw
    const instanceEvent = await CompassEventFactory.findCompassEvent(
      eventId,
      userId,
      session,
    );

    const baseEventId = instanceEvent?.recurrence?.eventId?.toString();

    if (!baseEventId) throw new Error("event is not a recurring instance");

    // get base event in series or throw
    const baseEvent = await CompassEventFactory.findCompassEvent(
      baseEventId,
      userId,
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
  ): Promise<CompassThisAndFollowingEvent[]> {
    const { baseEvent, instanceEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.user,
        session,
      );

    const startDate = parseCompassEventDate(instanceEvent.startDate!);
    const endDate = parseCompassEventDate(instanceEvent.endDate!);
    const duration = endDate.diff(startDate);

    const rruleOldSeries = new CompassEventRRule(baseEvent, {
      until: parseCompassEventDate(instanceEvent.startDate!)
        .subtract(duration, "millisecond")
        .toDate(),
    });

    const baseEventId = baseEvent._id.toString();

    const compassBaseEventWithUntil = {
      ...event,
      payload: {
        ...rruleOldSeries.base(),
        _id: baseEventId,
      },
    } as CompassThisAndFollowingEvent;

    const payload = EventUpdateSchema.parse(event.payload);

    delete payload.recurrence?.eventId;

    const rruleNewSeries = new CompassEventRRule({
      ...MapEvent.removeIdentifyingData(instanceEvent),
      ...(payload as Schema_Event_Recur_Base),
      _id: instanceEvent._id,
    });

    const newBase = rruleNewSeries.base();

    // new series
    const compassEvent = {
      ...event,
      payload: {
        ...newBase,
        _id: newBase._id.toString(),
      } as CompassThisAndFollowingEvent["payload"],
    } as CompassThisAndFollowingEvent;

    return [compassBaseEventWithUntil, compassEvent];
  }

  private static async genAllEvents(
    event: CompassEvent,
    session?: ClientSession,
  ): Promise<CompassAllEvents[]> {
    const { baseEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.user,
        session,
      );

    const eventId = baseEvent._id.toString();
    const payload = EventUpdateSchema.parse(event.payload);
    const nullRecurrence = payload.recurrence?.rule === null;

    delete payload.recurrence?.eventId;

    if (nullRecurrence) {
      delete (payload as Event_Core).recurrence;
      delete (baseEvent as unknown as Event_Core).recurrence;
    } else {
      delete payload.startDate;
      delete payload.endDate;
    }

    const compassEvent = {
      ...event,
      payload: {
        ...baseEvent,
        ...payload,
        _id: eventId,
      } as CompassAllEvents["payload"],
    } as CompassAllEvents;

    return [compassEvent];
  }

  private static async genThisEvent(
    event: CompassEvent,
    session?: ClientSession,
  ): Promise<CompassEvent[]> {
    const payload = event.payload as Schema_Event;
    const hasRRule = Array.isArray(payload.recurrence?.rule);
    const hasRecurringBase = !!payload.recurrence?.eventId;
    const isSomeday = payload.isSomeday;
    const nullRecurrence = payload.recurrence?.rule === null;
    const baseToStandaloneTransition = nullRecurrence && hasRecurringBase;
    const baseToSomedayTransition = isSomeday && hasRecurringBase;

    if (baseToStandaloneTransition || baseToSomedayTransition) {
      return CompassEventFactory.genAllEvents(event, session);
    }

    if (hasRRule && hasRecurringBase) delete payload.recurrence?.rule;
    if (nullRecurrence && !hasRecurringBase) delete payload.recurrence;

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

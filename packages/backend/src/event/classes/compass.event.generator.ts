import { ClientSession, Filter, ObjectId, WithId } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  CompassAllEvents,
  CompassEvent,
  CompassEventSchema,
  CompassEventStatus,
  CompassThisAndFollowingEvent,
  CompassThisEvent,
  EventUpdateSchema,
  Event_Core,
  RecurringEventUpdateScope,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { isAllDay, parseCompassEventDate } from "@core/util/event/event.util";
import mongoService from "@backend/common/services/mongo.service";

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
    event: CompassThisAndFollowingEvent,
    session?: ClientSession,
  ): Promise<CompassEvent[]> {
    const { baseEvent, instanceEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.user,
        session,
      );

    const baseStartDate = parseCompassEventDate(baseEvent.startDate!);
    const startDate = parseCompassEventDate(instanceEvent.startDate!);
    const updateAllSeries = startDate.isSameOrBefore(baseStartDate);
    const allDay = isAllDay(instanceEvent);

    if (updateAllSeries) {
      return CompassEventFactory.genAllEvents(
        {
          ...event,
          applyTo: RecurringEventUpdateScope.ALL_EVENTS,
        } as CompassAllEvents,
        session,
      );
    }

    const rruleOldSeries = new CompassEventRRule(baseEvent);
    const oldSeriesLastEventStartDate = rruleOldSeries.all().pop()!;
    const applyTo = RecurringEventUpdateScope.THIS_EVENT;
    const endDate = parseCompassEventDate(instanceEvent.endDate!);
    const duration = endDate.diff(startDate);

    const oldUntil = startDate.subtract(
      allDay ? 1 : duration,
      allDay ? "day" : "millisecond",
    );

    const rruleTruncatedSeries = new CompassEventRRule(baseEvent, {
      until: oldUntil.toDate(),
    });

    const truncateOldSeries = {
      ...event,
      applyTo,
      payload: {
        ...rruleTruncatedSeries.base(),
        _id: baseEvent._id.toString(),
      },
    } as CompassThisEvent;

    if (event.status === CompassEventStatus.CANCELLED) {
      return [{ ...truncateOldSeries, status: CompassEventStatus.CONFIRMED }];
    }

    const payload = EventUpdateSchema.parse(event.payload);

    delete payload.recurrence?.eventId;

    const _rruleNewSeries = new CompassEventRRule({
      ...MapEvent.removeIdentifyingData(instanceEvent),
      ...(payload as Schema_Event_Recur_Base),
      _id: new ObjectId(),
    });

    const rruleNewSeries = new CompassEventRRule(
      {
        ...MapEvent.removeIdentifyingData(instanceEvent),
        ...(payload as Schema_Event_Recur_Base),
        _id: new ObjectId(),
      },
      { until: _rruleNewSeries.options.until ?? oldSeriesLastEventStartDate },
    );

    const newBase = rruleNewSeries.base();

    // new series
    const newBaseEvent = {
      ...event,
      applyTo,
      payload: {
        ...newBase,
        _id: newBase._id.toString(),
      },
    } as CompassThisEvent;

    return [truncateOldSeries, newBaseEvent];
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
      return CompassEventFactory.genAllEvents(
        {
          ...event,
          applyTo: RecurringEventUpdateScope.ALL_EVENTS,
        } as CompassAllEvents,
        session,
      );
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

import { ClientSession, Filter, ObjectId, WithId } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  AllEventsUpdate,
  BaseEventSchema,
  EditableEventFieldsSchema,
  EventStatus,
  EventUpdate,
  EventUpdateSchema,
  RecurringEventUpdateScope,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
  ThisAndFollowingEventsUpdate,
  ThisEventUpdate,
} from "@core/types/event.types";
import { zObjectId } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { hasRRule, isAllDay, isInstance } from "@core/util/event/event.util";
import mongoService from "@backend/common/services/mongo.service";

export class CompassEventFactory {
  private static async findCompassEvent(
    eventId: ObjectId,
    calendar: ObjectId,
    session?: ClientSession,
    throwIfNotFound = true,
  ): Promise<Schema_Event | null> {
    const filter: Filter<Schema_Event> = { _id: eventId, calendar };

    const event = await mongoService.event.findOne(filter, { session });

    if (throwIfNotFound && !event) {
      throw new Error(`Compass event not found for id: ${eventId}`);
    }

    return event;
  }

  private static async findCompassBaseAndInstanceEvent(
    eventId: ObjectId,
    calendar: ObjectId,
    session?: ClientSession,
  ): Promise<{
    baseEvent: WithId<Schema_Base_Event>;
    instanceEvent: WithId<Omit<Schema_Instance_Event, "_id">>;
  }> {
    // get instance event or throw
    const instanceEvent = await CompassEventFactory.findCompassEvent(
      eventId,
      calendar,
      session,
    );

    const baseEventId = zObjectId.parse(instanceEvent?._id, {
      error: () => "event is not a recurring instance",
    });

    // get base event in series or throw
    const baseEvent = await CompassEventFactory.findCompassEvent(
      baseEventId,
      calendar,
      session,
    );

    return {
      baseEvent: BaseEventSchema.parse(baseEvent),
      instanceEvent: instanceEvent as WithId<
        Omit<Schema_Instance_Event, "_id">
      >,
    };
  }

  private static async genThisAndFollowingEventsUpdate(
    event: ThisAndFollowingEventsUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    const { baseEvent, instanceEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.calendar,
        session,
      );

    const baseStartDate = dayjs(baseEvent.startDate!);
    const startDate = dayjs(instanceEvent.startDate!);
    const updateAllSeries = startDate.isSameOrBefore(baseStartDate);
    const allDay = isAllDay(instanceEvent);

    if (updateAllSeries) {
      return CompassEventFactory.genAllEvents(
        {
          ...event,
          applyTo: RecurringEventUpdateScope.ALL_EVENTS,
        } as AllEventsUpdate,
        session,
      );
    }

    const rruleOldSeries = new CompassEventRRule(baseEvent);
    const oldSeriesLastEventStartDate = rruleOldSeries.all().pop()!;
    const applyTo = RecurringEventUpdateScope.THIS_EVENT;
    const endDate = dayjs(instanceEvent.endDate);
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
    } as ThisEventUpdate;

    if (event.status === EventStatus.CANCELLED) {
      return [{ ...truncateOldSeries, status: EventStatus.CONFIRMED }];
    }

    const payload = EditableEventFieldsSchema.parse(event.payload);

    delete payload.recurrence?.eventId;

    const _rruleNewSeries = new CompassEventRRule({
      ...MapEvent.removeIdentifyingData(instanceEvent),
      ...(payload as Schema_Base_Event),
      _id: new ObjectId(),
    });

    const rruleNewSeries = new CompassEventRRule(
      {
        ...MapEvent.removeIdentifyingData(instanceEvent),
        ...(payload as Schema_Base_Event),
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
    } as ThisEventUpdate;

    return [truncateOldSeries, newBaseEvent];
  }

  private static async genAllEvents(
    event: EventUpdate,
    session?: ClientSession,
  ): Promise<AllEventsUpdate[]> {
    const { baseEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.calendar,
        session,
      );

    const eventId = baseEvent._id.toString();
    const payload = EditableEventFieldsSchema.parse(event.payload);
    const nullRecurrence = payload.recurrence?.rule === null;

    if (payload.recurrence && "eventId" in payload.recurrence)
      delete payload.recurrence?.eventId;

    if (nullRecurrence) {
      delete payload.recurrence;
      delete baseEvent.recurrence;
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
      },
    };

    return [compassEvent];
  }

  private static async genThisEvent(
    event: ThisEventUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    const payload = event.payload as Schema_Event;
    const hasRule = hasRRule(payload);
    const isInstanceEvent = isInstance(payload);
    const nullRecurrence = payload.recurrence?.rule === null;

    if (nullRecurrence) delete payload.recurrence?.rule;
    if (hasRule && isInstanceEvent) delete payload.recurrence?.rule;
    if (nullRecurrence && !isInstanceEvent) delete payload.recurrence;

    return Promise.resolve([event]);
  }

  static async generateEvents(
    _event: EventUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    const event = EventUpdateSchema.parse(_event);

    switch (event.applyTo) {
      case RecurringEventUpdateScope.ALL_EVENTS:
        return CompassEventFactory.genAllEvents(event, session);
      case RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS:
        return CompassEventFactory.genThisAndFollowingEventsUpdate(
          event,
          session,
        );
      case RecurringEventUpdateScope.THIS_EVENT:
      default:
        return CompassEventFactory.genThisEvent(event, session);
    }
  }
}

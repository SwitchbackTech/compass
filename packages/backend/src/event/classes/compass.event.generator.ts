import { ClientSession, Filter, ObjectId, WithId } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  AllEventsUpdate,
  BaseEventSchema,
  EditableEventFieldsSchema,
  EventStatus,
  EventUpdate,
  EventUpdateSchema,
  RecurrenceSchema,
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
import { isAllDay } from "@core/util/event/event.util";
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

    const baseStartDate = dayjs(baseEvent.startDate);
    const startDate = dayjs(instanceEvent.originalStartDate);
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
      status: EventStatus.CONFIRMED,
      applyTo,
      payload: rruleTruncatedSeries.base(),
    };

    const payload = EditableEventFieldsSchema.parse(event.payload);
    const _id = new ObjectId();

    const _rruleNewSeries = new CompassEventRRule({
      ...MapEvent.removeIdentifyingData(instanceEvent),
      ...payload,
      order: 0,
      _id,
      recurrence: RecurrenceSchema.parse({
        eventId: _id,
        rule: payload.recurrence?.rule,
      }),
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
      payload: newBase,
    };

    return [truncateOldSeries, newBaseEvent];
  }

  private static async genAllEvents(
    event: AllEventsUpdate,
    session?: ClientSession,
  ): Promise<AllEventsUpdate[]> {
    const changes = EditableEventFieldsSchema.parse(event.payload);
    const { startDate: start, endDate: end, ...data } = changes;

    const { baseEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.calendar,
        session,
      );

    const { startDate, endDate } = baseEvent;

    startDate.setHours(start?.getHours() ?? startDate.getHours());
    startDate.setMinutes(start?.getMinutes() ?? startDate.getMinutes());
    startDate.setSeconds(start?.getSeconds() ?? startDate.getSeconds());
    startDate.setMilliseconds(
      start?.getMilliseconds() ?? startDate.getMilliseconds(),
    );

    endDate.setHours(end?.getHours() ?? endDate.getHours());
    endDate.setMinutes(end?.getMinutes() ?? endDate.getMinutes());
    endDate.setSeconds(end?.getSeconds() ?? endDate.getSeconds());
    endDate.setMilliseconds(
      end?.getMilliseconds() ?? endDate.getMilliseconds(),
    );

    const compassEvent = {
      ...event,
      payload: BaseEventSchema.parse({
        ...baseEvent,
        ...data,
        startDate,
        endDate,
      }),
    };

    return [compassEvent];
  }

  private static async genThisEvent(
    event: ThisEventUpdate,
  ): Promise<EventUpdate[]> {
    return Promise.resolve([event]);
  }

  static async generateEvents(
    _event: EventUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    console.log("Generating compass event updates for", _event);
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
        return CompassEventFactory.genThisEvent(event);
    }
  }
}

import { WithId } from "mongodb";
import {
  CalendarProvider,
  CompassCalendarSchema,
} from "@core/types/calendar.types";
import {
  BaseEventSchema,
  InstanceEventSchema,
  RegularEventSchema,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
  Schema_Regular_Event,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { isBase, isInstance, isRegular } from "@core/util/event/event.util";
import { EventDriver } from "@backend/__tests__/drivers/event.driver";
import mongoService from "@backend/common/services/mongo.service";
import { eventDatesToGcalDates } from "../../../../core/src/util/event/gcal.event.util";
import { baseEventExclusionFilterExpr } from "../services/event.service.util";

export async function testCompassRegularEvent(payload: Schema_Regular_Event) {
  const regularEvent = await mongoService.event.findOne({
    calendar: payload.calendar,
    _id: payload._id,
  });

  expect(regularEvent).toBeDefined();
  expect(regularEvent).not.toBeNull();

  expect(isRegular(regularEvent!)).toBe(true);

  expect(regularEvent?.recurrence).not.toBeDefined();
  expect(regularEvent?.recurrence).not.toBeNull();

  expect(regularEvent).toEqual(
    expect.objectContaining({
      ...payload,
      updatedAt: expect.any(Date),
      origin: CalendarProvider.COMPASS,
    }),
  );

  return { regularEvent: RegularEventSchema.parse(regularEvent) };
}

export async function testCompassInstanceEvent(payload: Schema_Instance_Event) {
  const instanceEvent = await mongoService.event.findOne({
    calendar: payload.calendar,
    _id: payload._id,
  });

  expect(instanceEvent).toBeDefined();
  expect(instanceEvent).not.toBeNull();

  expect(isInstance(InstanceEventSchema.parse(instanceEvent))).toBe(true);

  expect(instanceEvent).toEqual(
    expect.objectContaining({
      ...payload,
      updatedAt: expect.any(Date),
      origin: CalendarProvider.COMPASS,
    }),
  );

  return { instanceEvent };
}

export async function testCompassSeries(
  payload: Schema_Base_Event,
  instanceCount: number = 0, // recurrence rule count
) {
  // check that event is in db
  const _baseEvent = await mongoService.event.findOne({
    calendar: payload.calendar,
    _id: payload._id,
  });

  const baseEvent = BaseEventSchema.parse(_baseEvent);

  expect(isBase(baseEvent)).toBe(true);

  expect(baseEvent).toEqual(
    expect.objectContaining({
      ...payload,
      _id: payload._id,
      updatedAt: expect.any(Date),
    }),
  );

  expect(baseEvent).toHaveProperty("recurrence");
  expect(baseEvent.recurrence).toHaveProperty("rule");
  expect(baseEvent.recurrence?.rule).toBeInstanceOf(Array);
  expect(baseEvent.recurrence?.rule.length).toBeGreaterThan(0);
  expect(baseEvent.recurrence.eventId.equals(baseEvent._id)).toBe(true);

  // expect event to have instances
  const instances = await mongoService.event
    .find(
      {
        calendar: payload.calendar,
        "recurrence.eventId": baseEvent!._id,
        $expr: baseEventExclusionFilterExpr,
      },
      { sort: { startDate: 1 } },
    )
    .toArray();

  expect(instances).toHaveLength(instanceCount);

  expect(instances).toEqual(
    expect.arrayContaining(
      instances.map(() =>
        expect.objectContaining({
          recurrence: {
            eventId: payload._id,
            rule: baseEvent.recurrence.rule,
          },
          isSomeday: payload.isSomeday,
          updatedAt: expect.any(Date),
        }),
      ),
    ),
  );

  return {
    baseEvent: BaseEventSchema.parse(baseEvent),
    instances: InstanceEventSchema.array().parse(instances),
  };
}

export async function testCompassEventNotInGcal(event: Schema_Event) {
  const cal = await mongoService.calendar.findOne({ _id: event.calendar });
  const calendar = CompassCalendarSchema.parse(cal);
  const user = calendar.user;

  expect(user).toBeDefined();
  // check that event does not have external calendar provider attributes
  expect(event).not.toHaveProperty("metadata");
  // check that event does not exist in external calendar
  await expect(
    EventDriver.getGCalEvent(user, event._id.toString(), calendar.metadata.id),
  ).rejects.toThrow(`Event with id ${event._id.toString()} not found`);
}

export async function testCompassEventInGcal(
  event: Schema_Event,
): Promise<gSchema$Event> {
  const _id = event.calendar;
  const _calendar = await mongoService.calendar.findOne({ _id });
  const calendar = CompassCalendarSchema.parse(_calendar);
  const user = calendar.user;
  const gCalendarId = calendar.metadata.id;
  const dates = eventDatesToGcalDates(event);

  expect(user).toBeDefined();
  // check that event does not have external calendar provider attributes
  expect(event).toHaveProperty("metadata");
  // check that event exists in external calendar
  const gEventId = StringV4Schema.parse(event.metadata?.id);
  const gcalEvent = await EventDriver.getGCalEvent(user, gEventId, gCalendarId);

  expect(gcalEvent).toEqual(
    expect.objectContaining({
      id: gEventId,
      summary: event.title,
      ...(event.description ? { description: event.description } : {}),
      ...dates,
      extendedProperties: {
        private: expect.objectContaining({
          priority: event.priority,
        }),
      },
    }),
  );

  return gcalEvent;
}

export async function testCompassSeriesInGcal(
  baseEvent: WithId<Schema_Base_Event>,
  instances: Array<WithId<Omit<Schema_Instance_Event, "_id">>>,
) {
  // check that event has gcal attributes
  expect(baseEvent).toHaveProperty("metadata.id");

  instances.forEach((instance) => {
    expect(instance).toHaveProperty("metadata.id");
    expect(instance).toHaveProperty("metadata.recurringEventId");
  });

  // check that event exist in gcal
  const gcalEvent = await testCompassEventInGcal(baseEvent);

  const gcalInstances = await Promise.all(
    instances.map(testCompassEventInGcal),
  );

  expect(gcalEvent).toHaveProperty("recurrence");

  expect(gcalEvent).toEqual(
    expect.objectContaining({
      id: baseEvent.metadata?.id,
      recurrence: baseEvent.recurrence!.rule,
    }),
  );

  expect(gcalInstances).toEqual(
    expect.arrayContaining(
      gcalInstances.map(() =>
        expect.objectContaining({
          recurringEventId: baseEvent.metadata?.id,
        }),
      ),
    ),
  );

  return { baseEvent: gcalEvent, instances: gcalInstances };
}

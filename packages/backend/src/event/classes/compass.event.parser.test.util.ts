import { ObjectId, WithId } from "mongodb";
import {
  CalendarProvider,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
  Schema_Event_Regular,
  WithCompassId,
} from "@core/types/event.types";
import {
  isBase,
  isInstance,
  isRegularEvent,
} from "@core/util/event/event.util";
import mongoService from "@backend/common/services/mongo.service";
import { _getGcal } from "@backend/event/services/event.service";
import { gSchema$Event } from "../../../../core/src/types/gcal";

export async function testCompassStandaloneEvent(
  payload: WithCompassId<Schema_Event_Regular>,
) {
  const standaloneEvent = await mongoService.event.findOne({
    user: payload.user,
    _id: new ObjectId(payload._id),
  });

  expect(standaloneEvent).toBeDefined();
  expect(standaloneEvent).not.toBeNull();

  expect(isRegularEvent(standaloneEvent!)).toBe(true);

  expect(standaloneEvent?.recurrence).not.toBeDefined();
  expect(standaloneEvent?.recurrence).not.toBeNull();

  expect(standaloneEvent).toEqual(
    expect.objectContaining({
      ...payload,
      _id: new ObjectId(payload._id),
      updatedAt: expect.any(Date),
      origin: CalendarProvider.COMPASS,
    }),
  );

  return {
    standaloneEvent: standaloneEvent as WithId<
      Omit<Schema_Event_Regular, "_id">
    >,
  };
}

export async function testCompassInstanceEvent(
  payload: WithCompassId<Schema_Event_Recur_Instance>,
) {
  const instanceEvent = (await mongoService.event.findOne({
    user: payload.user,
    _id: new ObjectId(payload._id),
  })) as WithId<Omit<Schema_Event_Recur_Instance, "_id">>;

  expect(instanceEvent).toBeDefined();
  expect(instanceEvent).not.toBeNull();

  expect(isInstance(instanceEvent!)).toBe(true);

  expect(instanceEvent).toEqual(
    expect.objectContaining({
      ...payload,
      _id: new ObjectId(payload._id),
      updatedAt: expect.any(Date),
      origin: CalendarProvider.COMPASS,
    }),
  );

  return { instanceEvent };
}

export async function testCompassSeries(
  payload: WithCompassId<Schema_Event_Recur_Base>,
  instanceCount: number = 0, // recurrence rule count
) {
  // check that event is in db
  const baseEvent = (await mongoService.event.findOne({
    user: payload.user,
    _id: new ObjectId(payload._id),
  })) as WithId<Omit<Schema_Event_Recur_Base, "_id">> | null;

  expect(isBase(baseEvent!)).toBe(true);

  expect(baseEvent).toEqual(
    expect.objectContaining({
      ...payload,
      _id: new ObjectId(payload._id),
      updatedAt: expect.any(Date),
      origin: CalendarProvider.COMPASS,
    }),
  );

  expect(baseEvent).toHaveProperty("recurrence");
  expect(baseEvent?.recurrence).toHaveProperty("rule");
  expect(baseEvent?.recurrence.rule).toBeInstanceOf(Array);
  expect(baseEvent?.recurrence.rule.length).toBeGreaterThan(0);
  expect(baseEvent?.recurrence).not.toHaveProperty("eventId");

  // expect event to have instances
  const instances = (await mongoService.event
    .find({
      user: payload.user,
      "recurrence.eventId": baseEvent!._id.toString(),
    })
    .toArray()) as Array<WithId<Omit<Schema_Event_Recur_Instance, "_id">>>;

  expect(instances).toHaveLength(payload.isSomeday ? 0 : instanceCount);

  expect(instances).toEqual(
    expect.arrayContaining(
      instances.map(() =>
        expect.objectContaining({
          recurrence: { eventId: payload._id },
          isSomeday: payload.isSomeday,
          updatedAt: expect.any(Date),
          origin: CalendarProvider.COMPASS,
        }),
      ),
    ),
  );

  return { baseEvent: baseEvent!, instances };
}

export async function testCompassEventNotInGcal(
  event: WithId<Omit<Schema_Event, "_id">>,
) {
  // check that event does not have external calendar provider attributes
  expect(event).not.toHaveProperty("gEventId");
  expect(event).not.toHaveProperty("gRecurringEventId");
  // check that event does not exist in external calendar
  await expect(_getGcal(event.user!, event._id.toString()!)).rejects.toThrow(
    `Event with id ${event._id.toString()} not found`,
  );
}

export async function testCompassEventInGcal(
  event: WithId<Omit<Schema_Event, "_id">>,
): Promise<gSchema$Event> {
  // check that event does not have external calendar provider attributes
  expect(event).toHaveProperty("gEventId");
  // check that event exists in external calendar
  const gcalEvent = await _getGcal(event.user!, event!.gEventId!);

  expect(gcalEvent).toEqual(
    expect.objectContaining({
      id: event!.gEventId,
      summary: event.title,
    }),
  );

  return gcalEvent;
}

export async function testCompassSeriesInGcal(
  baseEvent: WithId<Omit<Schema_Event_Recur_Base, "_id">>,
  instances: Array<WithId<Omit<Schema_Event_Recur_Instance, "_id">>>,
) {
  // check that event has gcal attributes
  expect(baseEvent).toHaveProperty("gEventId");

  instances.forEach((instance) => {
    expect(instance).toHaveProperty("gEventId");
    expect(instance).toHaveProperty("gRecurringEventId");
  });

  // check that event exist in gcal
  const gcalEvent = await _getGcal(baseEvent.user!, baseEvent.gEventId!);

  const gcalInstances = await Promise.all(
    instances.map((instance) => _getGcal(baseEvent.user!, instance.gEventId!)),
  );

  expect(gcalEvent).toHaveProperty("recurrence");

  expect(gcalEvent).toEqual(
    expect.objectContaining({
      id: baseEvent.gEventId,
      recurrence: baseEvent.recurrence!.rule,
    }),
  );

  expect(gcalInstances).toEqual(
    expect.arrayContaining(
      gcalInstances.map(() =>
        expect.objectContaining({
          recurringEventId: baseEvent.gEventId!,
        }),
      ),
    ),
  );

  return { baseEvent: gcalEvent, instances: gcalInstances };
}

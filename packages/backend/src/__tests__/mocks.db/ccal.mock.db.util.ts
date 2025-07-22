import { ObjectId } from "mongodb";
import {
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockInstance,
} from "@core/util/test/ccal.event.factory";
import mongoService from "@backend/common/services/mongo.service";

export const createRecurrenceSeries = async (
  baseOverrides: Partial<Schema_Event_Recur_Base>,
  instanceOverrides?: Partial<Schema_Event_Recur_Instance>,
) => {
  // Create a recurring event with instances
  const baseEvent = createMockBaseEvent({
    recurrence: { rule: ["RRULE:FREQ=DAILY"] },
    ...baseOverrides,
  });

  const baseId = baseEvent._id;
  if (!baseId) throw Error("Base event id is required");
  const gEventId = baseEvent.gEventId;
  if (!gEventId) throw Error("Base event gEventId is required");
  const instance1 = createMockInstance(baseId, gEventId, {
    ...instanceOverrides,
  });

  const instance2 = createMockInstance(baseId, gEventId, {
    ...instanceOverrides,
  });

  await mongoService.event.insertMany([
    withObjectId(baseEvent),
    withObjectId(instance1),
    withObjectId(instance2),
  ]);

  const status = await mongoService.event.find().toArray();
  const meta = { createdCount: status.length };
  return {
    state: {
      baseEvent: baseEvent,
      instances: [instance1, instance2],
    },
    meta,
  };
};

const withObjectId = (event: Schema_Event) => {
  return {
    ...event,
    _id: event._id ? new ObjectId(event._id) : new ObjectId(),
  };
};

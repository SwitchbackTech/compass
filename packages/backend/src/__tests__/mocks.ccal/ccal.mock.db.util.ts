import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker/.";
import {
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { TestSetup } from "../helpers/mock.db.setup";
import { createMockBaseEvent, createMockInstance } from "./ccal.event.factory";

export const createRecurrenceSeries = async (
  setup: TestSetup,
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
  const instance1 = createMockInstance(baseId, {
    ...instanceOverrides,
  });

  const instance2 = createMockInstance(baseId, {
    ...instanceOverrides,
    // prevents collision with instance1
    gEventId: `mock-instance-id-${faker.string.uuid()}`,
  });

  await setup.db
    .collection(Collections.EVENT)
    .insertMany([
      withObjectId(baseEvent),
      withObjectId(instance1),
      withObjectId(instance2),
    ]);

  const status = await setup.db.collection(Collections.EVENT).find().toArray();
  const meta = { createdCount: status.length };
  return {
    state: {
      baseEvent: baseEvent,
      instances: [],
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

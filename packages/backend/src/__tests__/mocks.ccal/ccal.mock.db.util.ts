import { faker } from "@faker-js/faker/.";
import {
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

  const instance1 = createMockInstance(baseEvent._id as string, {
    ...instanceOverrides,
  });

  const instance2 = createMockInstance(baseEvent._id as string, {
    ...instanceOverrides,
    // prevents collision with instance1
    gEventId: `mock-instance-id-${faker.string.uuid()}`,
  });

  await setup.db
    .collection(Collections.EVENT)
    .insertMany([baseEvent, instance1, instance2]);
  console.log(baseEvent, instance1, instance2);

  const status = await setup.db.collection(Collections.EVENT).find().toArray();
  const meta = { createdCount: status.length };
  return {
    state: {
      baseEvent,
      instances: [instance1, instance2],
    },
    meta,
  };
};

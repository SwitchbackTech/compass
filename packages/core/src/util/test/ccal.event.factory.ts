import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
  WithCompassId,
} from "@core/types/event.types";
import { appendWithRfc5545Timestamp } from "@core/util/date/date.util";

dayjs.extend(timezone);

export const createMockStandaloneEvent = (
  overrides: Partial<Schema_Event> = {},
): WithCompassId<Schema_Event> => {
  const start = faker.date.future();
  const end = dayjs(start).add(1, "hour");
  return {
    _id: new ObjectId().toString(),
    title: faker.lorem.sentence(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    user: "test-user-id",
    origin: Origin.COMPASS,
    priority: Priorities.WORK,
    ...overrides,
  };
};

/**
 * Creates a base recurring event with default values that can be overridden.
 * @param overrides - The overrides for the mock base event.
 * @returns A base recurring event.
 */
export const createMockBaseEvent = (
  overrides: Partial<Schema_Event_Recur_Base> = {},
): WithCompassId<Schema_Event_Recur_Base> => {
  const now = new Date();
  return {
    _id: new ObjectId().toString(),
    title: "Weekly Team Sync",
    description: "Weekly team meeting",
    startDate: "2024-03-20T10:00:00Z",
    endDate: "2024-03-20T11:00:00Z",
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY"],
    },
    user: "test-user-id",
    origin: Origin.GOOGLE,
    priority: Priorities.WORK,
    isAllDay: false,
    isSomeday: false,
    updatedAt: now,
    ...overrides,
  };
};

/**
 * Creates a recurring event instance with default values that can be overridden.
 * @param baseEventId - The ID of the base event this instance belongs to.
 * @param overrides - The overrides for the mock instance.
 * @returns A recurring event instance.
 */
export const createMockInstance = (
  baseEventId: string,
  gBaseId: string,
  overrides: Partial<Schema_Event_Recur_Instance> = {},
): WithCompassId<Schema_Event_Recur_Instance> => {
  const now = new Date();
  const tz = faker.location.timeZone();
  // Generate times dynamically but in the right tz
  const start = dayjs.tz(faker.date.future(), tz);
  const startIso = start.toISOString();
  const end = start.add(1, "hour");

  const gEventId = appendWithRfc5545Timestamp(gBaseId, startIso);

  const instance = {
    _id: new ObjectId().toString(),
    title: "Weekly Team Sync",
    startDate: startIso,
    endDate: end.toISOString(),
    recurrence: {
      eventId: baseEventId,
    },
    user: "test-user-id",
    origin: Origin.GOOGLE,
    priority: Priorities.WORK,
    isAllDay: false,
    isSomeday: false,
    updatedAt: now,
    gEventId,
    gRecurringEventId: baseEventId,
    ...overrides,
  };
  return instance;
};

/**
 * Creates a series of recurring event instances.
 * @param baseEvent - The base event to create instances from.
 * @param count - The number of instances to create.
 * @param overrides - Optional overrides for all instances.
 * @returns An array of event instances.
 */
export const createMockInstances = (
  baseEvent: Schema_Event_Recur_Base,
  count: number,
  overrides: Partial<Schema_Event_Recur_Instance> = {},
): WithCompassId<Schema_Event_Recur_Instance>[] => {
  const instances: WithCompassId<Schema_Event_Recur_Instance>[] = [];
  const baseDate = new Date(baseEvent.startDate || "2024-03-20T10:00:00Z");

  for (let i = 0; i < count; i++) {
    const instanceDate = new Date(baseDate);
    instanceDate.setDate(instanceDate.getDate() + (i + 1) * 7); // Weekly recurrence

    instances.push(
      createMockInstance(baseEvent._id || "", baseEvent.gEventId as string, {
        startDate: instanceDate.toISOString(),
        endDate: new Date(instanceDate.getTime() + 3600000).toISOString(), // 1 hour later
        ...overrides,
      }),
    );
  }

  return instances;
};

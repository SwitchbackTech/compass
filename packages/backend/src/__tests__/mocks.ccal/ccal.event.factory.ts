import { ObjectId } from "mongodb";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";

/**
 * Creates a base recurring event with default values that can be overridden.
 * @param overrides - The overrides for the mock base event.
 * @returns A base recurring event.
 */
export const createMockBaseEvent = (
  overrides: Partial<Schema_Event_Recur_Base> = {},
): Schema_Event_Recur_Base => {
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
  overrides: Partial<Schema_Event_Recur_Instance> = {},
): Schema_Event_Recur_Instance => {
  const now = new Date();
  return {
    _id: new ObjectId().toString(),
    title: "Weekly Team Sync",
    startDate: "2024-03-27T10:00:00Z",
    endDate: "2024-03-27T11:00:00Z",
    recurrence: {
      eventId: baseEventId,
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
): Schema_Event_Recur_Instance[] => {
  const instances: Schema_Event_Recur_Instance[] = [];
  const baseDate = new Date(baseEvent.startDate || "2024-03-20T10:00:00Z");

  for (let i = 0; i < count; i++) {
    const instanceDate = new Date(baseDate);
    instanceDate.setDate(instanceDate.getDate() + (i + 1) * 7); // Weekly recurrence

    instances.push(
      createMockInstance(baseEvent._id || "", {
        startDate: instanceDate.toISOString(),
        endDate: new Date(instanceDate.getTime() + 3600000).toISOString(), // 1 hour later
        ...overrides,
      }),
    );
  }

  return instances;
};

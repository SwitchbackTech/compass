import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
  WithCompassId,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { isAllDay, parseCompassEventDate } from "../event/event.util";

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
    isSomeday: false,
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
  allDayEvent = false,
): WithCompassId<Schema_Event_Recur_Base> => {
  const { startDate } = overrides;
  const now = new Date();
  const allDay = allDayEvent || isAllDay(overrides) || overrides.isAllDay;
  const date = startDate ? parseCompassEventDate(startDate) : undefined;
  const dates = generateCompassEventDates({ date, allDay });

  return {
    _id: new ObjectId().toString(),
    title: "Weekly Team Sync",
    description: "Weekly team meeting",
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY"],
    },
    user: "test-user-id",
    origin: Origin.COMPASS,
    priority: Priorities.WORK,
    isSomeday: false,
    updatedAt: now,
    ...overrides,
    isAllDay: allDay ?? false,
    ...dates,
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

  const gEventId = `${gBaseId}_${start.toRRuleDTSTARTString()}`;

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
    gRecurringEventId: gBaseId,
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

export const generateCompassEventDates = ({
  date,
  allDay = false,
  value = 1,
  unit = "hours",
}: {
  date?: dayjs.ConfigType;
  value?: number;
  unit?: dayjs.ManipulateType;
  allDay?: boolean;
  timezone?: string;
} = {}): Pick<Schema_Event, "startDate" | "endDate"> => {
  const timeZone = dayjs.tz.guess();
  const start = dayjs.tz(date ?? faker.date.future(), timeZone);
  const end = start.add(value, unit);
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const format = allDay ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return { startDate: start.format(format), endDate: end.format(format) };
};

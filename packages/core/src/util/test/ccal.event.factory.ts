import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  BaseEventSchema,
  RegularEventSchema,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
  Schema_Regular_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";

export const createMockStandaloneEvent = (
  overrides: Partial<Omit<Schema_Event, "endDate">> = {},
  allDay = false,
  dateDiff: Omit<
    Partial<
      Exclude<Parameters<typeof generateCompassEventDates>[0], undefined>
    >,
    "date" | "allDay"
  > = {},
): Schema_Regular_Event => {
  const { startDate } = overrides;
  const now = new Date();
  const date = dayjs(startDate);
  const dates = generateCompassEventDates({ ...dateDiff, date, allDay });

  return RegularEventSchema.parse({
    _id: new ObjectId(),
    calendar: new ObjectId(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement(Object.values(Priorities)),
    origin: Origin.COMPASS,
    isSomeday: false,
    updatedAt: now,
    ...overrides,
    ...dates,
  });
};

/**
 * Creates a base recurring event with default values that can be overridden.
 * @param overrides - The overrides for the mock base event.
 * @returns A base recurring event.
 */
export const createMockBaseEvent = (
  overrides: Partial<Omit<Schema_Base_Event, "endDate">> = {},
  allDayEvent = false,
  dateDiff: Parameters<typeof createMockStandaloneEvent>[2] = {},
): Schema_Base_Event => {
  const regularEvent = createMockStandaloneEvent(
    overrides,
    allDayEvent,
    dateDiff,
  );

  return BaseEventSchema.parse({
    ...regularEvent,
    recurrence: overrides.recurrence ?? { rule: ["RRULE:FREQ=WEEKLY"] },
  });
};

/**
 * Creates a series of recurring event instances.
 * @param baseEvent - The base event to create instances from.
 * @param count - The number of instances to create.
 * @param overrides - Optional overrides for all instances.
 * @returns An array of event instances.
 */
export const createMockInstances = (
  baseEvent: Schema_Base_Event,
  count?: number,
  overrides: Partial<Schema_Instance_Event> = {},
): Schema_Instance_Event[] => {
  const _id = new ObjectId(baseEvent._id);
  const rrule = new CompassEventRRule({ ...baseEvent, _id }, { count });

  return rrule.instances().map((i) => ({ ...i, ...overrides }));
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
  const _start = dayjs.tz(date ?? faker.date.future(), timeZone);
  const start = allDay ? _start.startOf("day") : _start;
  const end = allDay ? start.endOf("day") : start.add(value, unit);

  return { startDate: start.toDate(), endDate: end.toDate() };
};

export const createRecurrenceSeries = (
  baseOverrides: Partial<Schema_Base_Event>,
  instanceOverrides?: Partial<Schema_Instance_Event>,
) => {
  const base = createMockBaseEvent(baseOverrides);
  const instances = createMockInstances(base, undefined, instanceOverrides);

  return { base, instances };
};

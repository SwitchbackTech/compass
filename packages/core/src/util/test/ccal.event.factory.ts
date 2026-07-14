import { faker } from "@faker-js/faker";
import { ObjectId } from "bson";
import { Origin } from "@core/constants/core.constants";
import {
  type BaseEvent,
  type InstanceEvent,
  type CompassEvent,
  type StandaloneEvent,
} from "@core/types/compass-event.contracts";
import { type WithId } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { isAllDay, parseCompassEventDate } from "@core/util/event/event.util";
import { CompassEventRRule } from "../event/compass.event.rrule";

export const createMockStandaloneEvent = (
  overrides: Partial<Omit<CompassEvent, "endDate">> = {},
  allDayEvent = false,
  dateDiff: Omit<
    Partial<
      Exclude<Parameters<typeof generateCompassEventDates>[0], undefined>
    >,
    "date" | "allDay"
  > = {},
): WithId<StandaloneEvent> => {
  const { startDate } = overrides;
  const now = new Date();
  const allDay = allDayEvent || isAllDay(overrides) || overrides.isAllDay;
  const date = startDate ? parseCompassEventDate(startDate) : undefined;
  const dates = generateCompassEventDates({ ...dateDiff, date, allDay });

  return {
    _id: new ObjectId().toString(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    user: new ObjectId().toString(),
    origin: Origin.COMPASS,
    updatedAt: now,
    ...overrides,
    isAllDay: allDay ?? false,
    ...dates,
  };
};

/**
 * Creates a base recurring event with default values that can be overridden.
 * @param overrides - The overrides for the mock base event.
 * @returns A base recurring event.
 */
export const createMockBaseEvent = (
  overrides: Partial<Omit<BaseEvent, "endDate">> = {},
  allDayEvent = false,
  dateDiff: Parameters<typeof createMockStandaloneEvent>[2] = {},
): WithId<BaseEvent> => {
  const regularEvent = createMockStandaloneEvent(
    overrides,
    allDayEvent,
    dateDiff,
  );

  return {
    ...regularEvent,
    recurrence: overrides.recurrence ?? { rule: ["RRULE:FREQ=WEEKLY"] },
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
  overrides: Partial<InstanceEvent> = {},
): WithId<InstanceEvent> => {
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
    isAllDay: false,
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
  baseEvent: BaseEvent,
  count: number,
  overrides: Partial<InstanceEvent> = {},
): WithId<InstanceEvent>[] => {
  const _id = new ObjectId(baseEvent._id);
  const rrule = new CompassEventRRule({ ...baseEvent, _id }, { count });

  return rrule
    .instances()
    .map((i) => ({ ...i, ...overrides, _id: i._id.toString() }));
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
} = {}): Pick<CompassEvent, "startDate" | "endDate"> => {
  const timeZone = dayjs.tz.guess();
  const start = dayjs.tz(date ?? faker.date.future(), timeZone);
  const end = start.add(value, unit);
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const format = allDay ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return { startDate: start.format(format), endDate: end.format(format) };
};

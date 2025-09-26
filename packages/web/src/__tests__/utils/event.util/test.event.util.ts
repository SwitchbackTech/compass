import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { Schema_DraftEvent } from "@web/common/schemas/events/draft.event.schemas";
import { Schema_WebEvent } from "@web/common/schemas/events/web.event.schemas";

/**
 * These utils focus on generating web-specific schemas.
 * For generating API-compatible events, see utils in `@core`
 */

export const createWebEvent = (
  overrides: Partial<Schema_WebEvent> = {},
): Schema_WebEvent => {
  const start = faker.date.future();
  const end = dayjs(start).add(1, "hour");

  return {
    _id: faker.string.uuid(),
    origin: Origin.COMPASS,
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    priority: faker.helpers.arrayElement(Object.values(Priorities)),
    recurrence: undefined,
    user: faker.string.uuid(),
    ...overrides,
  };
};

import { faker } from "@faker-js/faker";
import { type gSchema$CalendarListEntry } from "@core/types/gcal";

/**
 * Generates a mock Google Calendar calendar list entry.
 *
 * @param overrides - The overrides for the mock.
 * @returns The mock Google Calendar calendar list entry.
 */
export const createMockCalendarListEntry = (
  overrides: Partial<gSchema$CalendarListEntry> = {},
): gSchema$CalendarListEntry => {
  return {
    kind: "calendar#calendarListEntry",
    id: "test-calendar",
    primary: true,
    etag: faker.number.hex({ min: 16, max: 16 }).toString(),
    summary: faker.lorem.sentence({ min: 3, max: 5 }),
    description: faker.lorem.paragraph({ min: 1, max: 3 }),
    timeZone: faker.location.timeZone(),
    colorId: faker.number.int({ min: 1, max: 24 }).toString(),
    backgroundColor: "#9e9e9e",
    foregroundColor: "#000000",
    selected: true,
    accessRole: faker.helpers.arrayElement(["reader", "writer", "owner"]),
    defaultReminders: [],
    conferenceProperties: {
      allowedConferenceSolutionTypes: faker.helpers.arrayElements(
        ["hangoutsMeet", "eventHangout", "eventNamedHangout"],
        { min: 1, max: 3 },
      ),
    },
    ...overrides,
  };
};

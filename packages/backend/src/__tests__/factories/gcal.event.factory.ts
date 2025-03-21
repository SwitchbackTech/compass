import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import { gSchema$Event } from "@core/types/gcal";

export const generateRegularEvent = (): gSchema$Event => ({
  id: faker.string.uuid(),
  summary: faker.lorem.sentence(),
  start: { dateTime: faker.date.future().toISOString() },
  end: { dateTime: faker.date.future().toISOString() },
  status: "confirmed",
});

export const generateRecurringEvent = (): gSchema$Event => ({
  ...generateRegularEvent(),
  recurrence: ["RRULE:FREQ=WEEKLY"],
});

interface Mock_Events_Gcal {
  gcalEvents: gSchema$Event[];
  totals: {
    regular: number;
    recurring: number;
    cancelled: number;
    total: number;
  };
}
export const generateGcalEvents = (): Mock_Events_Gcal => {
  const COUNT_REGULAR = 5;
  const COUNT_RECURRING = 3;
  const COUNT_CANCELLED = 2;

  const totals = {
    regular: COUNT_REGULAR,
    recurring: COUNT_RECURRING,
    cancelled: COUNT_CANCELLED,
    total: COUNT_REGULAR + COUNT_RECURRING + COUNT_CANCELLED,
  };

  const gcalEvents = [
    ...Array(COUNT_REGULAR)
      .fill(null)
      .map(() => generateRegularEvent()),
    ...Array(COUNT_RECURRING)
      .fill(null)
      .map(() => generateRecurringEvent()),
    ...Array(COUNT_CANCELLED)
      .fill(null)
      .map(() => ({
        ...generateRegularEvent(),
        status: "cancelled",
      })),
  ];

  return { gcalEvents, totals };
};

export const mockGcalEvent = (
  overrides: Partial<gSchema$Event> = {},
): gSchema$Event => ({
  id: "test-event-id",
  summary: "Test Event",
  status: "confirmed",
  htmlLink: "https://www.google.com/calendar/event?eid=test-event-id",
  created: "2025-03-19T10:32:57.036Z",
  updated: "2025-03-19T10:32:57.036Z",
  start: {
    dateTime: "2025-03-19T14:45:00-05:00",
    timeZone: "America/Chicago",
  },
  end: {
    dateTime: "2025-03-19T16:00:00-05:00",
    timeZone: "America/Chicago",
  },
  iCalUID: "test-event-id@google.com",
  sequence: 0,
  extendedProperties: {
    private: {
      origin: Origin.GOOGLE_IMPORT,
      priority: Priorities.UNASSIGNED,
    },
  },
  reminders: {
    useDefault: true,
  },
  eventType: "default",
  ...overrides,
});

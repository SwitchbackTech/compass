import { faker } from "@faker-js/faker";
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

export const generateGcalEvents = () => {
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

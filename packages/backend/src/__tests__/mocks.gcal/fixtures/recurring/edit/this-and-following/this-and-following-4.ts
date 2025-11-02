import { EventStatus } from "@core/types/event.types";
import { gSchema$Events } from "@core/types/gcal";

export const thisAndFollowing4Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p337rddesgeg8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-23T10:48:49.144Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CM-2tdyDoIwDEM-2tdyDoIwDGAUg79XP3wIo79XP3wI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485453858289310"',
      id: "68k0p6ackplecqs9fuvbs1fju0",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:48:49.144Z",
      summary: "🍽️ Dishes",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-24T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-24T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250326T045959Z"],
      iCalUID: "68k0p6ackplecqs9fuvbs1fju0@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485453858289310"',
      id: "68k0p6ackplecqs9fuvbs1fju0_20250324T123000Z",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:48:49.144Z",
      summary: "🍽️ Dishes: Edited Just This One",
      description: "Only the title and description were changed",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-24T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-24T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "68k0p6ackplecqs9fuvbs1fju0",
      originalStartTime: {
        dateTime: "2025-03-24T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "68k0p6ackplecqs9fuvbs1fju0@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485453858289310"',
      id: "68k0p6ackplecqs9fuvbs1fju0_R20250326T123000",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjZUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:48:49.144Z",
      summary: "🍽️ Dishes 🔮",
      description: "Selected to change this and future events",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-26T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-26T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "68k0p6ackplecqs9fuvbs1fju0_R20250326T123000@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

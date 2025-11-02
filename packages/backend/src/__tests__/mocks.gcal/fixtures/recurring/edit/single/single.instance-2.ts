import { EventStatus } from "@core/types/event.types";
import { gSchema$Events } from "@core/types/gcal";

export const singleInstance2Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p33fobpn8jig8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-23T12:41:05.993Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CN-F5uicoIwDEN-F5uicoIwDGAUg79XP3wIo79XP3wI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485467331986878"',
      id: "0e6062d5un60i5sn2m9et69c27",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=MGU2MDYyZDV1bjYwaTVzbjJtOWV0NjljMjdfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:39:52.000Z",
      updated: "2025-03-23T12:41:05.993Z",
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
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "0e6062d5un60i5sn2m9et69c27@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485467331986878"',
      id: "0e6062d5un60i5sn2m9et69c27_20250326T123000Z",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=MGU2MDYyZDV1bjYwaTVzbjJtOWV0NjljMjdfMjAyNTAzMjZUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:39:52.000Z",
      updated: "2025-03-23T12:41:05.993Z",
      summary: "🌙 Dishes-Edited One",
      description: "changed time from morning to night",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-26T20:45:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-26T21:30:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "0e6062d5un60i5sn2m9et69c27",
      originalStartTime: {
        dateTime: "2025-03-26T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "0e6062d5un60i5sn2m9et69c27@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

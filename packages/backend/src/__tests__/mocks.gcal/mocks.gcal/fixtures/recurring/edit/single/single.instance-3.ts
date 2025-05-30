import { gSchema$Events } from "@core/types/gcal";

/**
 * Payload with instances that were each edited individually
 */
export const singleInstance3Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32fv7hlkjag8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-23T12:30:19.560Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CJ_zxrSaoIwDEJ_zxrSaoIwDGAUg79XP3wIo79XP3wI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485466039120702"',
      id: "1kmd7abo2uok36n1pkaemqncba",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=MWttZDdhYm8ydW9rMzZuMXBrYWVtcW5jYmFfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:27:05.000Z",
      updated: "2025-03-23T12:30:19.560Z",
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
      iCalUID: "1kmd7abo2uok36n1pkaemqncba@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485466039120702"',
      id: "1kmd7abo2uok36n1pkaemqncba_20250326T123000Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=MWttZDdhYm8ydW9rMzZuMXBrYWVtcW5jYmFfMjAyNTAzMjZUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:27:05.000Z",
      updated: "2025-03-23T12:30:19.560Z",
      summary: "🧼 Dishes-Edited Just This One",
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
      recurringEventId: "1kmd7abo2uok36n1pkaemqncba",
      originalStartTime: {
        dateTime: "2025-03-26T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "1kmd7abo2uok36n1pkaemqncba@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485466039120702"',
      id: "1kmd7abo2uok36n1pkaemqncba_20250327T123000Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=MWttZDdhYm8ydW9rMzZuMXBrYWVtcW5jYmFfMjAyNTAzMjdUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:27:05.000Z",
      updated: "2025-03-23T12:30:19.560Z",
      summary: "🫧 Dishes - Edited just this one",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-27T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-27T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "1kmd7abo2uok36n1pkaemqncba",
      originalStartTime: {
        dateTime: "2025-03-27T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "1kmd7abo2uok36n1pkaemqncba@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485466039120702"',
      id: "1kmd7abo2uok36n1pkaemqncba_20250328T123000Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=MWttZDdhYm8ydW9rMzZuMXBrYWVtcW5jYmFfMjAyNTAzMjhUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:27:05.000Z",
      updated: "2025-03-23T12:30:19.560Z",
      summary: "🧺 Dishes - Just this one",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-28T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-28T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "1kmd7abo2uok36n1pkaemqncba",
      originalStartTime: {
        dateTime: "2025-03-28T07:30:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "1kmd7abo2uok36n1pkaemqncba@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

import { gSchema$Events } from "@core/types/gcal";

export const allPayload1: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32nuv4dugig8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-23T10:52:14.082Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CK_vkb6EoIwDEK_vkb6EoIwDGAUg79XP3wIo79XP3wI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485454268165982"',
      id: "68k0p6ackplecqs9fuvbs1fju0",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:52:14.082Z",
      summary: "🧽 Dishes",
      description: "Changed all occurrences",
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
      etag: '"3485454268165982"',
      id: "68k0p6ackplecqs9fuvbs1fju0_20250324T123000Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:52:14.082Z",
      summary: "🧽 Dishes",
      description: "Changed all occurrences",
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
      etag: '"3485454268165982"',
      id: "68k0p6ackplecqs9fuvbs1fju0_R20250326T123000",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjZUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:52:14.082Z",
      summary: "🧽 Dishes",
      description: "Changed all occurrences",
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

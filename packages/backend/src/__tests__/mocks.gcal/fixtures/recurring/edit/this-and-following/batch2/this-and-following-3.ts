import { gSchema$Events } from "@core/types/gcal";

export const thisAndFollowing3Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32vp9duvpqh8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-24T11:29:47.600Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CL-Ut9_OoowDEL-Ut9_OoowDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485631575200894"',
      id: "0214krqh7jr2n0bobv19djs5aj",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=MDIxNGtycWg3anIybjBib2J2MTlkanM1YWpfMjAyNTAzMTJUMTQxNTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-12T11:50:21.000Z",
      updated: "2025-03-24T11:29:47.600Z",
      summary: "🥓 Breakfast",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-12T09:15:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-12T10:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250326T045959Z"],
      iCalUID: "0214krqh7jr2n0bobv19djs5aj@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485631575200894"',
      id: "0214krqh7jr2n0bobv19djs5aj_R20250326T141500",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=MDIxNGtycWg3anIybjBib2J2MTlkanM1YWpfMjAyNTAzMjZUMTQxNTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-12T11:50:21.000Z",
      updated: "2025-03-24T11:29:47.600Z",
      summary: "🍳 Breakfast - This And Following",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-26T09:15:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-26T10:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "0214krqh7jr2n0bobv19djs5aj_R20250326T141500@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

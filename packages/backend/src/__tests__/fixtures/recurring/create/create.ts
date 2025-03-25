import { gSchema$Events } from "@core/types/gcal";

export const newRecurringEventPayload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32fttgkdgag8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-23T10:41:35.252Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CJ_ewo2CoIwDEJ_ewo2CoIwDGAUg79XP3wIo79XP3wI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485452990504510"',
      id: "68k0p6ackplecqs9fuvbs1fju0",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NjhrMHA2YWNrcGxlY3FzOWZ1dmJzMWZqdTBfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T10:41:35.000Z",
      updated: "2025-03-23T10:41:35.252Z",
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
      iCalUID: "68k0p6ackplecqs9fuvbs1fju0@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

import { EventStatus } from "@core/types/event.types";
import { gSchema$Events } from "@core/types/gcal";

export const deleteSinglePayload2: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32nv5rnfmaioo0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-25T14:03:05.090Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CK_y7u-ypYwDEK_y7u-ypYwDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485822770180702"',
      id: "72o12msae3t6au1lim41i8tu6j",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=NzJvMTJtc2FlM3Q2YXUxbGltNDFpOHR1NmpfMjAyNTAzMjRUMTUwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-25T14:02:10.000Z",
      updated: "2025-03-25T14:03:05.090Z",
      summary: "🗣️ Meeting w/ team",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-24T10:00:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-24T11:30:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "72o12msae3t6au1lim41i8tu6j@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485822770180702"',
      id: "72o12msae3t6au1lim41i8tu6j_20250328T150000Z",
      status: EventStatus.CANCELLED,
      recurringEventId: "72o12msae3t6au1lim41i8tu6j",
      originalStartTime: {
        dateTime: "2025-03-28T10:00:00-05:00",
        timeZone: "America/Chicago",
      },
    },
  ],
};

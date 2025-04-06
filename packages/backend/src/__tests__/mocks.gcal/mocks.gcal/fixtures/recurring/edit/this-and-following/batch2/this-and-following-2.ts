import { gSchema$Events } from "@core/types/gcal";

export const thisAndFollowing2Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p337pvgsdpqh8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-24T11:26:55.832Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CM-fw43OoowDEM-fw43OoowDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485631231664030"',
      id: "3i234gl45i6i1s8rpui7dleor0",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=M2kyMzRnbDQ1aTZpMXM4cnB1aTdkbGVvcjBfMjAyNTAzMTJUMTMxNTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-12T12:18:30.000Z",
      updated: "2025-03-24T11:26:55.832Z",
      summary: "📝 journal",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-12T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-12T09:00:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250326T045959Z"],
      iCalUID: "3i234gl45i6i1s8rpui7dleor0@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485631231664030"',
      id: "3i234gl45i6i1s8rpui7dleor0_20250315T131500Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=M2kyMzRnbDQ1aTZpMXM4cnB1aTdkbGVvcjBfMjAyNTAzMTVUMTMxNTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-12T12:18:30.000Z",
      updated: "2025-03-24T11:26:55.832Z",
      summary: "📝 journal",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-15T16:00:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-15T16:45:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "3i234gl45i6i1s8rpui7dleor0",
      originalStartTime: {
        dateTime: "2025-03-15T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "3i234gl45i6i1s8rpui7dleor0@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485631231664030"',
      id: "3i234gl45i6i1s8rpui7dleor0_20250319T131500Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=M2kyMzRnbDQ1aTZpMXM4cnB1aTdkbGVvcjBfMjAyNTAzMTlUMTMxNTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-12T12:18:30.000Z",
      updated: "2025-03-24T11:26:55.832Z",
      summary: "📝 journal",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-20T16:30:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-20T17:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "3i234gl45i6i1s8rpui7dleor0",
      originalStartTime: {
        dateTime: "2025-03-19T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "3i234gl45i6i1s8rpui7dleor0@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485631231664030"',
      id: "3i234gl45i6i1s8rpui7dleor0_R20250326T131500",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=M2kyMzRnbDQ1aTZpMXM4cnB1aTdkbGVvcjBfMjAyNTAzMjZUMTMxNTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-12T12:18:30.000Z",
      updated: "2025-03-24T11:26:55.832Z",
      summary: "🐛 Journal - This And Following",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-03-26T08:15:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-26T09:00:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "3i234gl45i6i1s8rpui7dleor0_R20250326T131500@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

import { gSchema$Events } from "@core/types/gcal";

export const thisAndFollowing2Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p327plvtbvatoo0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-04-03T13:21:24.348Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CI-a_6v6u4wDEI-a_6v6u4wDGAUgxqid4QIoxqid4QI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3487372968696350"',
      id: "3a8nkmjcuj9a6f4qn917se9fv3",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=M2E4bmttamN1ajlhNmY0cW45MTdzZTlmdjNfMjAyNTA0MDJUMTk0NTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-04-03T13:21:06.000Z",
      updated: "2025-04-03T13:21:24.348Z",
      summary: "r5",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-04-02T14:45:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-04-02T15:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250403T045959Z"],
      iCalUID: "3a8nkmjcuj9a6f4qn917se9fv3@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3487372968696350"',
      id: "3a8nkmjcuj9a6f4qn917se9fv3_R20250403T194500",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=M2E4bmttamN1ajlhNmY0cW45MTdzZTlmdjNfMjAyNTA0MDNUMTk0NTAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-04-03T13:21:06.000Z",
      updated: "2025-04-03T13:21:24.348Z",
      summary: "r5-i",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-04-03T14:45:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-04-03T15:15:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "3a8nkmjcuj9a6f4qn917se9fv3_R20250403T194500@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

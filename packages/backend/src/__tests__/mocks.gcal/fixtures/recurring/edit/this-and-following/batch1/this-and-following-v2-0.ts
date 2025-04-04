import { gSchema$Events } from "@core/types/gcal";

export const thisAndFollowing0Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32vujd53seh8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-24T13:01:38.877Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CL_ptKPjoowDEL_ptKPjoowDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485642597755262"',
      id: "5hni4sj3ql1669otmjg7sn1mok",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NWhuaTRzajNxbDE2NjlvdG1qZzdzbjFtb2tfMjAyNTAyMDlUMTQwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-24T12:58:18.000Z",
      updated: "2025-03-24T13:01:38.877Z",
      summary: "🍜 Breakfast",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-02-09T08:00:00-06:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-02-09T09:00:00-06:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250401T045959Z"],
      iCalUID: "5hni4sj3ql1669otmjg7sn1mok@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485642597755262"',
      id: "e5srrkr361upjc2be22u6ti4pe",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=ZTVzcnJrcjM2MXVwamMyYmUyMnU2dGk0cGVfMjAyNTA0MDFUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-24T12:58:18.000Z",
      updated: "2025-03-24T13:01:38.877Z",
      summary: "🥑 Breakfast: This And Following",
      description:
        "Was originally 8-9am and a hot dish emoji. \nChanged to avacado and 7-8am\nThe event I changed the recurrence on was April 1, 2025\n----\nAll events before April 1 should have hot dish",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-04-01T07:00:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-04-01T08:00:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "e5srrkr361upjc2be22u6ti4pe@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

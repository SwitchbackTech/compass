import { EventStatus } from "@core/types/event.types";
import { gSchema$Events } from "@core/types/gcal";

export const deleteThisAndFollowingPayload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p337tt2lekqioo0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-25T13:07:05.909Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CM_eiq6mpYwDEM_eiq6mpYwDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485816051818142"',
      id: "5hni4sj3ql1669otmjg7sn1mok",
      status: EventStatus.CONFIRMED,
      htmlLink:
        "https://www.google.com/calendar/event?eid=NWhuaTRzajNxbDE2NjlvdG1qZzdzbjFtb2tfMjAyNTAyMDlUMTQwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-24T12:58:18.000Z",
      updated: "2025-03-25T13:07:05.909Z",
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
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250327T045959Z"],
      iCalUID: "5hni4sj3ql1669otmjg7sn1mok@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485816051818142"',
      id: "5hni4sj3ql1669otmjg7sn1mok_20250325T130000Z",
      status: EventStatus.CANCELLED,
      recurringEventId: "5hni4sj3ql1669otmjg7sn1mok",
      originalStartTime: {
        dateTime: "2025-03-25T08:00:00-05:00",
        timeZone: "America/Chicago",
      },
    },
  ],
};

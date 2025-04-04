import { gSchema$Events } from "@core/types/gcal";

export const singleInstance4Payload: gSchema$Events = {
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
      etag: '"3486841886526878"',
      id: "e5srrkr361upjc2be22u6ti4pe_20250401T120000Z",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=ZTVzcnJrcjM2MXVwamMyYmUyMnU2dGk0cGVfMjAyNTA0MDFUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-24T12:58:18.000Z",
      updated: "2025-03-31T11:35:43.263Z",
      summary: "🍊 Breakfast: This And Following v2",
      description:
        "Was originally 8-9am and a hot dish emoji. \n" +
        "Changed to avacado and 7-8am\n" +
        "Then changed to orange",
      creator: { email: "test.user@gmail.com", self: true },
      organizer: { email: "test.user@gmail.com", self: true },
      start: {
        dateTime: "2025-03-30T07:00:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-03-30T08:00:00-05:00",
        timeZone: "America/Chicago",
      },
      recurringEventId: "e5srrkr361upjc2be22u6ti4pe",
      originalStartTime: {
        dateTime: "2025-04-01T07:00:00-05:00",
        timeZone: "America/Chicago",
      },
      iCalUID: "e5srrkr361upjc2be22u6ti4pe@google.com",
      sequence: 3,
      reminders: { useDefault: true },
      eventType: "default",
    },
  ],
};

import { gSchema$Events } from "@core/types/gcal";

export const thisAndFollowing1Payload: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p33npng78iug8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-23T12:18:43.196Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CO-bwOiXoIwDEO-bwOiXoIwDGAUg79XP3wIo79XP3wI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485464646392798"',
      id: "4k3h1bqn0pmn2qmvc7m0b6ip2q",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NGszaDFicW4wcG1uMnFtdmM3bTBiNmlwMnFfMjAyNTAzMjRUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:16:13.000Z",
      updated: "2025-03-23T12:18:43.196Z",
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
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250327T045959Z"],
      iCalUID: "4k3h1bqn0pmn2qmvc7m0b6ip2q@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485464646392798"',
      id: "4k3h1bqn0pmn2qmvc7m0b6ip2q_R20250327T123000",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=NGszaDFicW4wcG1uMnFtdmM3bTBiNmlwMnFfMjAyNTAzMjdUMTIzMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-23T12:16:13.000Z",
      updated: "2025-03-23T12:18:43.196Z",
      summary: "🧽 Dishes",
      description:
        "Originally was: 🍽️\nThen clicked the fourth instances, renamed to 🧽, and applied to THIS AND FOLLOWING",
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
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "4k3h1bqn0pmn2qmvc7m0b6ip2q_R20250327T123000@google.com",
      sequence: 0,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

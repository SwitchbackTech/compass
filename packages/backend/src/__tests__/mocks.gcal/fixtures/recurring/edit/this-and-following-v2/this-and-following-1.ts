/**
 * Scenario: After editing a recurrence that was previously edited
 */
export const thisAndFollowing1Payload = {
  kind: "calendar#events",
  etag: '"p33vrvivsseh8o0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-24T13:04:45.895Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CP-_y_zjoowDEP-_y_zjoowDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485642971791358"',
      id: "e5srrkr361upjc2be22u6ti4pe",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=ZTVzcnJrcjM2MXVwamMyYmUyMnU2dGk0cGVfMjAyNTA0MDFUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-24T12:58:18.000Z",
      updated: "2025-03-24T13:04:45.895Z",
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
      recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250409T045959Z"],
      iCalUID: "e5srrkr361upjc2be22u6ti4pe@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
    {
      kind: "calendar#event",
      etag: '"3485642971791358"',
      id: "e5srrkr361upjc2be22u6ti4pe_R20250409T120000",
      status: "confirmed",
      htmlLink:
        "https://www.google.com/calendar/event?eid=ZTVzcnJrcjM2MXVwamMyYmUyMnU2dGk0cGVfMjAyNTA0MDlUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
      created: "2025-03-24T12:58:18.000Z",
      updated: "2025-03-24T13:04:45.895Z",
      summary: "🍊 Breakfast: This And Following v2",
      description:
        "Was originally 8-9am and a hot dish emoji. \nChanged to avacado and 7-8am\nThen changed to orange",
      creator: {
        email: "test.user@gmail.com",
        self: true,
      },
      organizer: {
        email: "test.user@gmail.com",
        self: true,
      },
      start: {
        dateTime: "2025-04-09T07:00:00-05:00",
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: "2025-04-09T08:00:00-05:00",
        timeZone: "America/Chicago",
      },
      recurrence: ["RRULE:FREQ=DAILY"],
      iCalUID: "e5srrkr361upjc2be22u6ti4pe_R20250409T120000@google.com",
      sequence: 1,
      reminders: {
        useDefault: true,
      },
      eventType: "default",
    },
  ],
};

import { Action_Series } from "../recurrence.types";
import { GCalRecurringEventMapper } from "./gcal.recur.map";

describe("GCalRecurringEventMapper", () => {
  it("infers the correct action", () => {
    const changesFromGcal = {
      action: "UPDATE_SERIES" as Action_Series,
      baseEvent: {
        kind: "calendar#event",
        etag: '"3487376669522302"',
        id: "7q78dn5t1eu6ikjq5mj4q7s93d",
        status: "confirmed",
        htmlLink:
          "https://www.google.com/calendar/event?eid=N3E3OGRuNXQxZXU2aWtqcTVtajRxN3M5M2RfMjAyNTA0MDJUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
        created: "2025-04-03T13:49:29.000Z",
        updated: "2025-04-03T13:52:14.761Z",
        summary: "r1",
        creator: { email: "lance.essert@gmail.com", self: true },
        organizer: { email: "lance.essert@gmail.com", self: true },
        start: {
          dateTime: "2025-04-02T07:00:00-05:00",
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: "2025-04-02T08:00:00-05:00",
          timeZone: "America/Chicago",
        },
        recurrence: ["RRULE:FREQ=DAILY;UNTIL=20250403T045959Z"],
        iCalUID: "7q78dn5t1eu6ikjq5mj4q7s93d@google.com",
        sequence: 0,
        reminders: { useDefault: true },
        eventType: "default",
      },
      newBaseEvent: {
        kind: "calendar#event",
        etag: '"3487376669522302"',
        id: "7q78dn5t1eu6ikjq5mj4q7s93d_R20250403T120000",
        status: "confirmed",
        htmlLink:
          "https://www.google.com/calendar/event?eid=N3E3OGRuNXQxZXU2aWtqcTVtajRxN3M5M2RfMjAyNTA0MDNUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
        created: "2025-04-03T13:49:29.000Z",
        updated: "2025-04-03T13:52:14.761Z",
        summary: "r1-i",
        creator: { email: "lance.essert@gmail.com", self: true },
        organizer: { email: "lance.essert@gmail.com", self: true },
        start: {
          dateTime: "2025-04-03T07:00:00-05:00",
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: "2025-04-03T08:00:00-05:00",
          timeZone: "America/Chicago",
        },
        recurrence: ["RRULE:FREQ=DAILY"],
        iCalUID: "7q78dn5t1eu6ikjq5mj4q7s93d_R20250403T120000@google.com",
        sequence: 0,
        reminders: { useDefault: true },
        eventType: "default",
      },
      deleteFrom: "DAILY;UNTIL",
      hasInstances: false,
    };

    const mapper = new GCalRecurringEventMapper("123", changesFromGcal);
    const result = mapper.inferChanges();
    expect(result.action).toEqual("UPDATE_SERIES");
  });
});

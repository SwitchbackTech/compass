import { recurring } from "@core/__mocks__/events/gcal/gcal.recurring";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { gcalEvents } from "../../__mocks__/events/gcal/gcal.event";
import { Origin, Priorities } from "../../constants/core.constants";
import { MapEvent } from "../../mappers/map.event";

describe("toGcal", () => {
  const validGcalDates = [
    { start: "2022-01-01", end: "2022-01-02" },
    { start: "2022-01-01T07:07:00-05:00", end: "2022-01-01T12:27:23+10:00" },
  ];

  const validateGcalDateFormat = (gEvent: gSchema$Event) => {
    if (!gEvent.start || !gEvent.end) {
      throw new Error("Event must have start and end times");
    }

    // ensures YYYY-MM-DD format
    const _usesDashesCorrectly = (dateStr: string) => {
      expect(dateStr[4]).toBe("-");
      expect(dateStr[7]).toBe("-");
    };

    const _isAllDay = "date" in gEvent.start && "date" in gEvent.end;

    if (_isAllDay && gEvent.start.date && gEvent.end.date) {
      _usesDashesCorrectly(gEvent.start.date);
      _usesDashesCorrectly(gEvent.end.date);
    } else if (gEvent.start.dateTime && gEvent.end.dateTime) {
      const yyyymmddStart = gEvent.start.dateTime.slice(0, 10);
      const yyyymmddEnd = gEvent.end.dateTime.slice(0, 10);
      _usesDashesCorrectly(yyyymmddStart);
      _usesDashesCorrectly(yyyymmddEnd);

      // confirms the expected offset/timezone indicator char is in the string
      // for example, these both match: 2022-01-01T03:00:00-5:00, 2022-01-01T03:00:00+10:00
      // the + or - is the 19th char in the str
      const _hasTzOffset = (dateStr: string) =>
        ["-", "+"].includes(dateStr[19]);
      _hasTzOffset(gEvent.start.dateTime);
      _hasTzOffset(gEvent.end.dateTime);
    } else {
      throw new Error("Event must have either date or dateTime");
    }
  };

  it("returns dates in expected format", () => {
    validGcalDates.forEach((dates) => {
      const gcalEvt = MapEvent.toGcal({
        startDate: dates.start,
        endDate: dates.end,
      });
      validateGcalDateFormat(gcalEvt);
    });
  });

  it("saves priority as private extended property", () => {
    const gcalEvent = MapEvent.toGcal({
      _id: "yupm",
      user: "user1",
      title: "Jan 1 2021",
      isAllDay: true,
      startDate: "2021-01-01",
      endDate: "2021-01-02",
      priority: Priorities.WORK,
    });
    expect(gcalEvent.extendedProperties?.private?.["priority"]).toBe(
      Priorities.WORK,
    );
  });
  it("sets priority to unassigned as private extended properties when none provided", () => {
    const gcalEvent = MapEvent.toGcal({
      _id: "yupm",
      user: "user1",
      title: "Jan 1 2021",
      isAllDay: true,
      startDate: "2021-01-01",
      endDate: "2021-01-02",
    });
    expect(gcalEvent.extendedProperties?.private?.["priority"]).toBe(
      Priorities.UNASSIGNED,
    );
  });
  it("set origin to unsure as private extended properties when none provided", () => {
    const gcalEvent = MapEvent.toGcal({
      _id: "yupm",
      user: "user1",
      title: "Jan 1 2021",
      isAllDay: true,
      startDate: "2021-01-01",
      endDate: "2021-01-02",
    });
    expect(gcalEvent.extendedProperties?.private?.["origin"]).toBe(
      Origin.UNSURE,
    );
  });
});

describe("toCompass", () => {
  const eventsFromCompass = MapEvent.toCompass(
    "user1",
    gcalEvents.items as gSchema$Event[],
    Origin.COMPASS,
  );

  const eventsFromGcalImport = MapEvent.toCompass(
    "user1",
    gcalEvents.items as gSchema$Event[],
    Origin.GOOGLE_IMPORT,
  );

  const allEvents = [...eventsFromCompass, ...eventsFromGcalImport];

  describe("cancelled", () => {
    it("skips cancelled events", () => {
      const events = MapEvent.toCompass(
        "someId",
        gcalEvents.items as gSchema$Event[],
        Origin.GOOGLE,
      );

      const hasCancelledEvent = events.some((e: Schema_Event) => {
        return (e as any).status === "cancelled";
      });

      expect(hasCancelledEvent).toBe(false);
    });
  });

  describe("origin", () => {
    it("uses an expected origin", () => {
      allEvents.forEach((ce) => {
        expect(Object.values(Origin).includes(ce.origin)).toBe(true);
      });
    });
  });
  describe("isAllDay", () => {
    it("infers isAllDay when date is in YYYY-MM-DD format", () => {
      allEvents.forEach((e) => {
        if (e.startDate.length === "YYYY-MM-DD".length) {
          expect(e.isAllDay).toBe(true);
        }
      });
    });
  });
  describe("priority", () => {
    it("sets priority to unassigned by default", () => {
      const gEvent = (gcalEvents.items as gSchema$Event[]).find(
        (ge) => ge.summary === "No extendedProperties",
      );
      if (!gEvent) {
        throw new Error("Test event not found");
      }

      const cEvent = MapEvent.toCompass("user1", [gEvent], Origin.COMPASS)[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.priority).toBe(Priorities.UNASSIGNED);
    });

    it("gets priority from private extended properties", () => {
      const regularGcalEvent = (gcalEvents.items as gSchema$Event[]).find(
        (ge) => ge.summary === "Meeting with Stan",
      );
      if (!regularGcalEvent) {
        throw new Error("Test event not found");
      }

      const cEvent = MapEvent.toCompass(
        "user99",
        [regularGcalEvent],
        Origin.GOOGLE_IMPORT,
      )[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.priority).toBe("work");
    });
  });

  describe("recurrence", () => {
    it("does not include both recurrence rule and id simultaneously", () => {
      const gEvent = {
        kind: "calendar#event",
        etag: '"3487376669522302"',
        id: "7q78dn5t1eu6ikjq5mj4q7s93d_R20250403T120000",
        status: "confirmed",
        htmlLink:
          "https://www.google.com/calendar/event?eid=N3E3OGRuNXQxZXU2aWtqcTVtajRxN3M5M2RfMjAyNTA0MDNUMTIwMDAwWiBsYW5jZS5lc3NlcnRAbQ",
        created: "2025-04-03T13:49:29.000Z",
        updated: "2025-04-03T13:52:14.761Z",
        summary: "r1-i",
        creator: {
          email: "lance.essert@gmail.com",
          self: true,
        },
        organizer: {
          email: "lance.essert@gmail.com",
          self: true,
        },
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
        reminders: {
          useDefault: true,
        },
        eventType: "default",
      };

      const cEvent = MapEvent.toCompass("user1", [gEvent], Origin.COMPASS)[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeDefined();
      expect(cEvent.recurrence?.eventId).toBeUndefined();
    });
    it("includes recurrence for instances of recurring events", () => {
      const gEvent = recurring[0]?.items[1] as gSchema$Event | undefined;
      if (!gEvent) {
        throw new Error("Test event not found in mock data");
      }

      const cEvent = MapEvent.toCompass(
        "user1",
        [gEvent],
        Origin.GOOGLE_IMPORT,
      )[0];

      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeDefined();
      expect(cEvent.recurrence?.rule).toBeUndefined();
      expect(cEvent.recurrence?.eventId).toBe(gEvent.recurringEventId);
    });
    it("includes recurrence when rule is present", () => {
      const gEvent = recurring[0]?.items[0] as gSchema$Event | undefined;
      if (!gEvent) {
        throw new Error("Test event not found in mock data");
      }

      const cEvent = MapEvent.toCompass(
        "user1",
        [gEvent],
        Origin.GOOGLE_IMPORT,
      )[0];

      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeDefined();
      expect(cEvent.recurrence?.rule).toEqual(["RRULE:FREQ=DAILY"]);
      expect(cEvent.recurrence?.eventId).toBeUndefined();
    });
  });
});

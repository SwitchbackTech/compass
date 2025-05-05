import { gcalEvents } from "@core/__mocks__/v1/events/gcal/gcal.event";
import { recurring } from "@core/__mocks__/v1/events/gcal/gcal.recurring";
import { timed } from "@core/__mocks__/v1/events/gcal/gcal.timed";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { MapEvent } from "./map.event";

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

    it("sets priority to unassigned if a priority exists but doesn't match enum", () => {
      const gEvent = (gcalEvents.items as gSchema$Event[]).find(
        (ge) => ge.summary === "Meeting with Stan",
      );
      if (!gEvent) {
        throw new Error("Test event not found");
      }
      gEvent.extendedProperties = {
        private: {
          priority: "not-a-priority",
        },
      };

      const cEvent = MapEvent.toCompass("user1", [gEvent], Origin.COMPASS)[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.priority).toBe(Priorities.UNASSIGNED);
    });
  });

  describe("recurrence", () => {
    it("does not include gRecurringEventId for regular events", () => {
      const regularGEvent = timed[0] as gSchema$Event;
      const cEvent = MapEvent.toCompass(
        "user1",
        [regularGEvent],
        Origin.COMPASS,
      )[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.gRecurringEventId).toBeUndefined();
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
      expect(cEvent.recurrence).not.toBeNull();
      expect(cEvent.recurrence?.rule).toEqual(["RRULE:FREQ=DAILY"]);
      expect(cEvent.recurrence?.eventId).toBeUndefined();
    });
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
          email: "test.user@gmail.com",
          self: true,
        },
        organizer: {
          email: "test.user@gmail.com",
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
    it("stores the recurringEventId (gcal) as gRecurringEventId (Compass)", () => {
      const gEventInstance = recurring[0]?.items[1] as gSchema$Event;
      if (!gEventInstance) {
        throw new Error("Test event not found in mock data");
      }

      const cEvent = MapEvent.toCompass(
        "user1",
        [gEventInstance],
        Origin.GOOGLE_IMPORT,
      )[0];

      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeUndefined();
      expect(cEvent.recurrence?.rule).toBeUndefined();
      expect(cEvent.recurrence?.eventId).not.toBe(
        gEventInstance.recurringEventId,
      );
      expect(cEvent.gRecurringEventId).toBe(gEventInstance.recurringEventId);
    });
  });
});

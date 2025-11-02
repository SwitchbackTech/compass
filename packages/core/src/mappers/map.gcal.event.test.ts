import { ObjectId } from "bson";
import { gcalEvents } from "@core/__mocks__/v1/events/gcal/gcal.event";
import { recurring } from "@core/__mocks__/v1/events/gcal/gcal.recurring";
import { timed } from "@core/__mocks__/v1/events/gcal/gcal.timed";
import { Origin, Priorities } from "@core/constants/core.constants";
import { MapGCalEvent } from "@core/mappers/map.gcal.event";
import {
  EventStatus,
  InstanceEventMetadataSchema,
  Schema_Event,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { isBase } from "../util/event/event.util";

describe("toEvents", () => {
  const calendar = new ObjectId();

  const eventsFromCompass = MapGCalEvent.toEvents(
    calendar,
    gcalEvents.items as gSchema$Event[],
    Origin.COMPASS,
  );

  const eventsFromGcalImport = MapGCalEvent.toEvents(
    calendar,
    gcalEvents.items as gSchema$Event[],
    Origin.GOOGLE_IMPORT,
  );

  const allEvents = [...eventsFromCompass, ...eventsFromGcalImport];

  describe(EventStatus.CANCELLED, () => {
    it("skips cancelled events", () => {
      const events = MapGCalEvent.toEvents(
        calendar,
        gcalEvents.items as gSchema$Event[],
        Origin.GOOGLE,
      );

      const hasCancelledEvent = events.some((e: Schema_Event) => {
        return (e as gSchema$Event).status === EventStatus.CANCELLED;
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

  describe("priority", () => {
    it("sets priority to unassigned by default", () => {
      const gEvent = (gcalEvents.items as gSchema$Event[]).find(
        (ge) => ge.summary === "No extendedProperties",
      );
      if (!gEvent) {
        throw new Error("Test event not found");
      }

      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [gEvent],
        Origin.COMPASS,
      )[0];
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

      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [regularGcalEvent],
        Origin.GOOGLE_IMPORT,
      )[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.priority).toBe(Priorities.WORK);
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

      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [gEvent],
        Origin.COMPASS,
      )[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.priority).toBe(Priorities.UNASSIGNED);
    });
  });

  describe("recurrence", () => {
    it("does not include metadata.recurringEventId for regular events", () => {
      const regularGEvent = timed[0] as gSchema$Event;
      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [regularGEvent],
        Origin.COMPASS,
      )[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(() =>
        InstanceEventMetadataSchema.parse(cEvent.metadata),
      ).toThrow();
    });
    it("includes recurrence when rule is present", () => {
      const gEvent = recurring[0] as gSchema$Event | undefined;
      if (!gEvent) {
        throw new Error("Test event not found in mock data");
      }

      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [gEvent],
        Origin.GOOGLE_IMPORT,
      )[0];

      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeDefined();
      expect(cEvent.recurrence).not.toBeNull();
      expect(cEvent.recurrence?.rule).toEqual([
        "RRULE:FREQ=DAILY;UNTIL=20250916T225959Z",
      ]);
      expect(cEvent.recurrence?.eventId).toBeDefined();
    });
    it("includes both recurrence rule and id for base event", () => {
      const gEvent = {
        kind: "calendar#event",
        etag: '"3487376669522302"',
        id: "7q78dn5t1eu6ikjq5mj4q7s93d_R20250403T120000",
        status: EventStatus.CONFIRMED,
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

      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [gEvent],
        Origin.COMPASS,
      )[0];
      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeDefined();
      expect(cEvent.recurrence?.eventId).toBeDefined();
      expect(isBase(cEvent)).toBe(true);
    });

    it("stores the recurringEventId (gcal) in metadata.recurringEventId (Compass)", () => {
      const gEventInstance = recurring[1] as gSchema$Event;

      if (!gEventInstance) {
        throw new Error("Test event not found in mock data");
      }

      const cEvent = MapGCalEvent.toEvents(
        calendar,
        [recurring[0], gEventInstance],
        Origin.GOOGLE_IMPORT,
      )[1];

      if (!cEvent) {
        throw new Error("Failed to map event");
      }

      expect(cEvent.recurrence).toBeDefined();
      expect(cEvent.recurrence?.rule).toBeDefined();
      expect(cEvent.recurrence?.eventId).not.toBe(
        gEventInstance.recurringEventId,
      );
      expect(cEvent.metadata).toHaveProperty(
        "recurringEventId",
        gEventInstance.recurringEventId,
      );
    });

    it("stores throws an error if the base gcal event is not found", () => {
      expect(() =>
        MapGCalEvent.toEvents(
          calendar,
          recurring.slice(1),
          Origin.GOOGLE_IMPORT,
        ),
      ).toThrow("Base event not found for instance");
    });
  });
});

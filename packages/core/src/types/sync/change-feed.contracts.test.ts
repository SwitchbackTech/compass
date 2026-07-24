import { faker } from "@faker-js/faker";
import {
  ChangeFeedResponseSchema,
  ChangeFeedResumeQuerySchema,
  ImportProgressSchema,
  InvalidationEnvelopeSchema,
  SyncInvalidationSchema,
} from "@core/types/sync/change-feed.contracts";

const objectId = () => faker.database.mongodbObjectId();

describe("Sync change-feed contracts", () => {
  describe("ImportProgressSchema", () => {
    it("accepts a not-yet-started import", () => {
      const progress = {
        calendarsTotal: 0,
        calendarsCompleted: 0,
        complete: false,
      };
      expect(ImportProgressSchema.safeParse(progress).success).toBe(true);
    });

    it("accepts partial progress", () => {
      const progress = {
        calendarsTotal: 5,
        calendarsCompleted: 2,
        complete: false,
      };
      expect(ImportProgressSchema.safeParse(progress).success).toBe(true);
    });

    it("accepts complete once every calendar has finished", () => {
      const progress = {
        calendarsTotal: 5,
        calendarsCompleted: 5,
        complete: true,
      };
      expect(ImportProgressSchema.safeParse(progress).success).toBe(true);
    });

    it("rejects complete=true before every calendar finishes", () => {
      const progress = {
        calendarsTotal: 5,
        calendarsCompleted: 4,
        complete: true,
      };
      expect(ImportProgressSchema.safeParse(progress).success).toBe(false);
    });

    it("rejects complete=true with zero discovered calendars", () => {
      const progress = {
        calendarsTotal: 0,
        calendarsCompleted: 0,
        complete: true,
      };
      expect(ImportProgressSchema.safeParse(progress).success).toBe(false);
    });

    it("rejects calendarsCompleted exceeding calendarsTotal", () => {
      const progress = {
        calendarsTotal: 2,
        calendarsCompleted: 3,
        complete: false,
      };
      expect(ImportProgressSchema.safeParse(progress).success).toBe(false);
    });
  });

  describe("SyncInvalidationSchema", () => {
    it("accepts a connection invalidation", () => {
      const invalidation = { kind: "connection", connectionId: objectId() };
      expect(SyncInvalidationSchema.safeParse(invalidation).success).toBe(true);
    });

    it("accepts a calendar invalidation", () => {
      const invalidation = {
        kind: "calendar",
        connectionId: objectId(),
        calendarId: objectId(),
      };
      expect(SyncInvalidationSchema.safeParse(invalidation).success).toBe(true);
    });

    it("accepts an event invalidation carrying event and calendar ids", () => {
      const invalidation = {
        kind: "event",
        eventId: objectId(),
        calendarId: objectId(),
      };
      expect(SyncInvalidationSchema.safeParse(invalidation).success).toBe(true);
    });

    it("rejects an event invalidation carrying event content (privacy)", () => {
      const invalidation = {
        kind: "event",
        eventId: objectId(),
        calendarId: objectId(),
        title: "Therapy",
      };
      expect(SyncInvalidationSchema.safeParse(invalidation).success).toBe(
        false,
      );
    });

    it("accepts a command invalidation", () => {
      const invalidation = { kind: "command", commandId: objectId() };
      expect(SyncInvalidationSchema.safeParse(invalidation).success).toBe(true);
    });

    it("accepts an importProgress invalidation", () => {
      const invalidation = {
        kind: "importProgress",
        connectionId: objectId(),
        progress: {
          calendarsTotal: 3,
          calendarsCompleted: 1,
          complete: false,
        },
      };
      expect(SyncInvalidationSchema.safeParse(invalidation).success).toBe(true);
    });

    it("rejects an unrecognized kind", () => {
      expect(
        SyncInvalidationSchema.safeParse({ kind: "booking" }).success,
      ).toBe(false);
    });
  });

  describe("InvalidationEnvelopeSchema", () => {
    it("accepts an envelope with no tenant/principal identifiers", () => {
      const envelope = {
        invalidation: {
          kind: "event",
          eventId: objectId(),
          calendarId: objectId(),
        },
        emittedAt: "2026-07-20T12:00:00.000Z",
      };
      expect(InvalidationEnvelopeSchema.safeParse(envelope).success).toBe(true);
    });

    it("rejects a leaked tenantId field", () => {
      const envelope = {
        invalidation: {
          kind: "event",
          eventId: objectId(),
          calendarId: objectId(),
        },
        emittedAt: "2026-07-20T12:00:00.000Z",
        tenantId: objectId(),
      };
      expect(InvalidationEnvelopeSchema.safeParse(envelope).success).toBe(
        false,
      );
    });
  });

  describe("ChangeFeedResumeQuerySchema", () => {
    it("accepts a null cursor to resume from now", () => {
      expect(
        ChangeFeedResumeQuerySchema.safeParse({ cursor: null }).success,
      ).toBe(true);
    });

    it("accepts a non-null cursor", () => {
      expect(
        ChangeFeedResumeQuerySchema.safeParse({ cursor: "token-1" }).success,
      ).toBe(true);
    });

    it("rejects a missing cursor field", () => {
      expect(ChangeFeedResumeQuerySchema.safeParse({}).success).toBe(false);
    });

    it("rejects principal scoping via the query body", () => {
      const query = { cursor: null, principalId: objectId() };
      expect(ChangeFeedResumeQuerySchema.safeParse(query).success).toBe(false);
    });
  });

  describe("ChangeFeedResponseSchema", () => {
    it("accepts an ok response with invalidations", () => {
      const response = {
        kind: "ok",
        invalidations: [
          {
            invalidation: {
              kind: "event",
              eventId: objectId(),
              calendarId: objectId(),
            },
            emittedAt: "2026-07-20T12:00:00.000Z",
          },
        ],
        nextCursor: "token-2",
      };
      expect(ChangeFeedResponseSchema.safeParse(response).success).toBe(true);
    });

    it("accepts an ok response with an empty page", () => {
      const response = { kind: "ok", invalidations: [], nextCursor: "token-2" };
      expect(ChangeFeedResponseSchema.safeParse(response).success).toBe(true);
    });

    it("accepts a bare resyncRequired response", () => {
      expect(
        ChangeFeedResponseSchema.safeParse({ kind: "resyncRequired" }).success,
      ).toBe(true);
    });

    it("rejects a resyncRequired response carrying invalidations", () => {
      const response = { kind: "resyncRequired", invalidations: [] };
      expect(ChangeFeedResponseSchema.safeParse(response).success).toBe(false);
    });

    it("rejects an unrecognized kind", () => {
      expect(
        ChangeFeedResponseSchema.safeParse({ kind: "error" }).success,
      ).toBe(false);
    });
  });
});

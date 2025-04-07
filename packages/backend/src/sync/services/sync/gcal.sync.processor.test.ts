import { Category_Event } from "@core/types/event.types";
import { mockGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import { GcalSyncProcessor } from "./gcal.sync.processor";

describe("GcalSyncProcessor", () => {
  let processor: GcalSyncProcessor;
  const userId = "test-user-id";

  beforeEach(() => {
    const mockGcalInstance = mockGcal();
    processor = new GcalSyncProcessor(
      mockGcalInstance.google.calendar(),
      userId,
    );
  });

  describe("processEvents", () => {
    it("should process a regular event", async () => {
      const regularEvent = mockGcalEvent();
      const changes = await processor.processEvents([regularEvent]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: regularEvent.summary,
        category: Category_Event.STANDALONE,
        changeType: "ACTIVE",
        operation: "UPSERTED",
      });
    });

    it("should process a cancelled base recurrence", async () => {
      const cancelledEvent = mockGcalEvent({
        status: "cancelled",
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const changes = await processor.processEvents([cancelledEvent]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: cancelledEvent.summary,
        category: Category_Event.RECURRENCE_BASE,
        changeType: "CANCELLED",
        operation: "CANCELLED",
      });
    });

    it("should process a recurring event", async () => {
      const recurringEvent = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const changes = await processor.processEvents([recurringEvent]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: recurringEvent.summary,
        category: Category_Event.RECURRENCE_BASE,
        changeType: "ACTIVE",
        operation: "UPSERTED",
      });
    });

    it("should process a recurring instance", async () => {
      const recurringEvent = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"],
      });
      const instance = mockGcalEvent({
        recurringEventId: recurringEvent.id,
        originalStartTime: {
          dateTime: "2025-03-24T07:30:00-05:00",
          timeZone: "America/Chicago",
        },
      });
      const changes = await processor.processEvents([instance]);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        title: instance.summary,
        category: Category_Event.RECURRENCE_INSTANCE,
        changeType: "ACTIVE",
        operation: "UPSERTED",
      });
    });

    it("should process multiple events", async () => {
      const regularEvent = mockGcalEvent();
      const cancelledInstance = mockGcalEvent({
        status: "cancelled",
        summary: "Cancelled Instance",
        recurringEventId: "some-recurrence-id", // this makes it an instance
      });
      const recurrenceBase = mockGcalEvent({
        recurrence: ["RRULE:FREQ=DAILY"], // this makes it a base
      });
      const recurrenceInstance = mockGcalEvent({
        recurringEventId: recurrenceBase.id,
        originalStartTime: {
          dateTime: "2025-03-24T07:30:00-05:00",
          timeZone: "America/Chicago",
        },
      });

      const changes = await processor.processEvents([
        regularEvent,
        cancelledInstance,
        recurrenceBase,
        recurrenceInstance,
      ]);

      expect(changes).toHaveLength(4);
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: regularEvent.summary,
            category: Category_Event.STANDALONE,
            changeType: "ACTIVE",
            operation: "UPSERTED",
          }),
          expect.objectContaining({
            title: cancelledInstance.summary,
            category: Category_Event.RECURRENCE_INSTANCE,
            changeType: "CANCELLED",
            operation: "CANCELLED",
          }),
          expect.objectContaining({
            title: recurrenceBase.summary,
            category: Category_Event.RECURRENCE_BASE,
            changeType: "ACTIVE",
            operation: "UPSERTED",
          }),
          expect.objectContaining({
            title: recurrenceInstance.summary,
            category: Category_Event.RECURRENCE_INSTANCE,
            changeType: "ACTIVE",
            operation: "UPSERTED",
          }),
        ]),
      );
    });
  });
});

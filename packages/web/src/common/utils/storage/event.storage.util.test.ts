import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { compassLocalDB } from "./compass-local.db";
import {
  clearEventsFromIndexedDB,
  deleteEventFromIndexedDB,
  loadAllEventsFromIndexedDB,
  loadEventsFromIndexedDB,
  saveEventToIndexedDB,
} from "./event.storage.util";

describe("event.storage.util", () => {
  beforeEach(async () => {
    await clearEventsFromIndexedDB();
  });

  const createMockEvent = (overrides?: Partial<Event_Core>) => {
    return createMockStandaloneEvent(overrides) as Event_Core;
  };

  describe("saveEventToIndexedDB", () => {
    it("should save an event to IndexedDB", async () => {
      const event = createMockEvent();
      await saveEventToIndexedDB(event);

      const savedEvent = await compassLocalDB.events.get(event._id!);
      expect(savedEvent).toBeDefined();
      expect(savedEvent?._id).toBe(event._id);
      expect(savedEvent?.title).toBe(event.title);
    });

    it("should update an existing event when saving with same _id", async () => {
      const event = createMockEvent({ title: "Original Title" });
      await saveEventToIndexedDB(event);

      const updatedEvent = {
        ...event,
        title: "Updated Title",
      };
      await saveEventToIndexedDB(updatedEvent);

      const savedEvent = await compassLocalDB.events.get(event._id!);
      expect(savedEvent?.title).toBe("Updated Title");
    });

    it("should throw an error if event does not have an _id", async () => {
      const event = createMockEvent();
      delete event._id;

      await expect(saveEventToIndexedDB(event as Event_Core)).rejects.toThrow(
        "Event must have an _id to save to IndexedDB",
      );
    });
  });

  describe("loadEventsFromIndexedDB", () => {
    it("should load events within date range", async () => {
      const today = dayjs();
      const tomorrow = today.add(1, "day");
      const nextWeek = today.add(7, "days");

      const event1 = createMockEvent({
        startDate: today.toISOString(),
        endDate: today.add(1, "hour").toISOString(),
      });
      const event2 = createMockEvent({
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.add(1, "hour").toISOString(),
      });
      const event3 = createMockEvent({
        startDate: nextWeek.toISOString(),
        endDate: nextWeek.add(1, "hour").toISOString(),
      });

      await saveEventToIndexedDB(event1);
      await saveEventToIndexedDB(event2);
      await saveEventToIndexedDB(event3);

      const startDate = today.startOf("day").toISOString();
      const endDate = tomorrow.endOf("day").toISOString();

      const events = await loadEventsFromIndexedDB(startDate, endDate);

      expect(events).toHaveLength(2);
      expect(events.map((e) => e._id)).toContain(event1._id);
      expect(events.map((e) => e._id)).toContain(event2._id);
      expect(events.map((e) => e._id)).not.toContain(event3._id);
    });

    it("should filter by isSomeday when specified", async () => {
      const today = dayjs();

      const somedayEvent = createMockEvent({
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        isSomeday: true,
      });
      const regularEvent = createMockEvent({
        startDate: today.toISOString(),
        endDate: today.add(1, "hour").toISOString(),
        isSomeday: false,
      });

      await saveEventToIndexedDB(somedayEvent);
      await saveEventToIndexedDB(regularEvent);

      const startDate = today.startOf("day").toISOString();
      const endDate = today.endOf("day").toISOString();

      const somedayEvents = await loadEventsFromIndexedDB(
        startDate,
        endDate,
        true,
      );
      const regularEvents = await loadEventsFromIndexedDB(
        startDate,
        endDate,
        false,
      );

      expect(somedayEvents).toHaveLength(1);
      expect(somedayEvents[0]._id).toBe(somedayEvent._id);
      expect(regularEvents).toHaveLength(1);
      expect(regularEvents[0]._id).toBe(regularEvent._id);
    });

    it("should return empty array when no events match date range", async () => {
      const today = dayjs();
      const nextMonth = today.add(1, "month");

      const event = createMockEvent({
        startDate: nextMonth.toISOString(),
        endDate: nextMonth.add(1, "hour").toISOString(),
      });

      await saveEventToIndexedDB(event);

      const startDate = today.startOf("day").toISOString();
      const endDate = today.endOf("day").toISOString();

      const events = await loadEventsFromIndexedDB(startDate, endDate);

      expect(events).toHaveLength(0);
    });

    it("should include events on boundary dates", async () => {
      const today = dayjs();
      const startOfDay = today.startOf("day");
      const endOfDay = today.endOf("day");

      const event1 = createMockEvent({
        startDate: startOfDay.toISOString(),
        endDate: startOfDay.add(1, "hour").toISOString(),
      });
      const event2 = createMockEvent({
        startDate: endOfDay.toISOString(),
        endDate: endOfDay.add(1, "hour").toISOString(),
      });

      await saveEventToIndexedDB(event1);
      await saveEventToIndexedDB(event2);

      const events = await loadEventsFromIndexedDB(
        startOfDay.toISOString(),
        endOfDay.toISOString(),
      );

      expect(events).toHaveLength(2);
    });
  });

  describe("loadAllEventsFromIndexedDB", () => {
    it("should load all events from IndexedDB", async () => {
      const event1 = createMockEvent();
      const event2 = createMockEvent();

      await saveEventToIndexedDB(event1);
      await saveEventToIndexedDB(event2);

      const events = await loadAllEventsFromIndexedDB();

      expect(events).toHaveLength(2);
      expect(events.map((event) => event._id)).toEqual(
        expect.arrayContaining([event1._id, event2._id]),
      );
    });
  });

  describe("deleteEventFromIndexedDB", () => {
    it("should delete an event by ID", async () => {
      const event = createMockEvent();
      await saveEventToIndexedDB(event);

      await deleteEventFromIndexedDB(event._id!);

      const deletedEvent = await compassLocalDB.events.get(event._id!);
      expect(deletedEvent).toBeUndefined();
    });

    it("should not throw error when deleting non-existent event", async () => {
      await expect(
        deleteEventFromIndexedDB("non-existent-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("clearEventsFromIndexedDB", () => {
    it("should clear all events from IndexedDB", async () => {
      const event1 = createMockEvent();
      const event2 = createMockEvent();

      await saveEventToIndexedDB(event1);
      await saveEventToIndexedDB(event2);

      await clearEventsFromIndexedDB();

      const allEvents = await compassLocalDB.events.toArray();
      expect(allEvents).toHaveLength(0);
    });
  });
});

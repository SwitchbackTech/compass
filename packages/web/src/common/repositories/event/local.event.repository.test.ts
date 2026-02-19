import {
  Event_Core,
  Params_Events,
  Payload_Order,
  Schema_Event,
} from "@core/types/event.types";
import { isDateRangeOverlapping } from "@core/util/date/date.util";
import dayjs from "@core/util/date/dayjs";
import {
  createTestCompassEvent,
  createTestEvent,
} from "@web/__tests__/utils/repositories/repository.test.factory";
import * as storageAdapter from "@web/common/storage/adapter";
import { LocalEventRepository } from "./local.event.repository";

const mockEvents = new Map<string, Event_Core>();

function createMockAdapter() {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getTasks: jest.fn().mockResolvedValue([]),
    getAllTasks: jest.fn().mockResolvedValue([]),
    putTasks: jest.fn().mockResolvedValue(undefined),
    deleteTask: jest.fn().mockResolvedValue(undefined),
    moveTask: jest.fn().mockResolvedValue(undefined),
    clearAllTasks: jest.fn().mockResolvedValue(undefined),
    getEvents: jest.fn(
      async (startDate: string, endDate: string, isSomeday?: boolean) => {
        const allEvents = Array.from(mockEvents.values());
        let filtered = allEvents.filter((event) => {
          if (!event.startDate || !event.endDate) return false;
          return isDateRangeOverlapping(
            event.startDate,
            event.endDate,
            startDate,
            endDate,
            "day",
          );
        });
        if (isSomeday !== undefined) {
          filtered = filtered.filter((event) => event.isSomeday === isSomeday);
        }
        return filtered;
      },
    ),
    getAllEvents: jest.fn(async () => Array.from(mockEvents.values())),
    putEvent: jest.fn(async (event: Event_Core) => {
      mockEvents.set(event._id!, event);
    }),
    putEvents: jest.fn().mockResolvedValue(undefined),
    deleteEvent: jest.fn(async (id: string) => {
      mockEvents.delete(id);
    }),
    clearAllEvents: jest.fn().mockResolvedValue(undefined),
    getMigrationRecords: jest.fn().mockResolvedValue([]),
    setMigrationRecord: jest.fn().mockResolvedValue(undefined),
  };
}

jest.mock("@web/common/storage/adapter");

describe("LocalEventRepository", () => {
  let repository: LocalEventRepository;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(async () => {
    mockEvents.clear();
    mockAdapter = createMockAdapter();
    (storageAdapter.getStorageAdapter as jest.Mock).mockReturnValue(
      mockAdapter,
    );
    repository = new LocalEventRepository();
  });

  afterEach(() => {
    mockEvents.clear();
  });

  describe("create", () => {
    it("should save a single event to IndexedDB", async () => {
      const event = createTestEvent({
        _id: "event-1",
        title: "Test Event",
      });

      await repository.create(event);

      expect(mockEvents.has("event-1")).toBe(true);
      const savedEvent = mockEvents.get("event-1");
      expect(savedEvent).toBeDefined();
      expect(savedEvent?._id).toBe("event-1");
      expect(savedEvent?.title).toBe("Test Event");
    });

    it("should save multiple events to IndexedDB", async () => {
      const events = [
        createTestEvent({ _id: "event-1", title: "Event 1" }),
        createTestEvent({ _id: "event-2", title: "Event 2" }),
      ];

      await repository.create(events);

      expect(mockEvents.has("event-1")).toBe(true);
      expect(mockEvents.has("event-2")).toBe(true);
    });
  });

  describe("get", () => {
    it("should load events from IndexedDB filtered by date range", async () => {
      const today = dayjs().startOf("day");
      const tomorrow = today.add(1, "day").startOf("day");

      const todayStr = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const tomorrowStr = tomorrow.format(
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      );

      const event1 = createTestEvent({
        _id: "event-1",
        title: "Today Event",
        startDate: todayStr,
        endDate: todayStr,
      });

      await repository.create([event1]);

      // Verify event was created
      expect(mockEvents.size).toBe(1);

      const params: Params_Events = {
        startDate: todayStr,
        endDate: tomorrowStr,
        someday: false,
      };

      const result = await repository.get(params);

      // Verify the result structure
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("startDate");
      expect(result).toHaveProperty("endDate");
      expect(result.startDate).toBe(params.startDate);
      expect(result.endDate).toBe(params.endDate);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should filter by isSomeday flag", async () => {
      const today = dayjs().startOf("day");
      const dateStr = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

      const somedayEvent = createTestEvent({
        _id: "someday-1",
        title: "Someday Event",
        startDate: dateStr,
        endDate: dateStr,
        isSomeday: true,
      });

      const regularEvent = createTestEvent({
        _id: "regular-1",
        title: "Regular Event",
        startDate: dateStr,
        endDate: dateStr,
        isSomeday: false,
      });

      await repository.create([somedayEvent, regularEvent]);

      const params: Params_Events = {
        startDate: dateStr,
        endDate: dateStr,
        someday: true,
      };

      const result = await repository.get(params);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]._id).toBe("someday-1");
    });

    it("should return correct pagination metadata", async () => {
      const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const params: Params_Events = {
        startDate: dateStr,
        endDate: dateStr,
        someday: false,
      };

      const result = await repository.get(params);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBeGreaterThanOrEqual(0);
      expect(result.offset).toBe(0);
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("edit", () => {
    it("should update an event in IndexedDB", async () => {
      const event = createTestEvent({
        _id: "event-1",
        title: "Original Title",
      });

      await repository.create(event);

      const updatedEvent = createTestCompassEvent({
        _id: event._id!,
        title: "Updated Title",
        startDate: event.startDate,
        origin: event.origin,
        priority: event.priority,
        user: event.user,
      });

      await repository.edit("event-1", updatedEvent as Schema_Event, {});

      const savedEvent = mockEvents.get("event-1");
      expect(savedEvent?.title).toBe("Updated Title");
    });
  });

  describe("delete", () => {
    it("should delete an event from IndexedDB", async () => {
      const event = createTestEvent({
        _id: "event-1",
        title: "Test Event",
      });

      await repository.create(event);
      await repository.delete("event-1");

      expect(mockEvents.has("event-1")).toBe(false);
    });
  });

  describe("reorder", () => {
    it("should update event order in IndexedDB", async () => {
      const event1 = createTestEvent({
        _id: "event-1",
        title: "Event 1",
      });
      (event1 as Event_Core & { order?: number }).order = 0;

      const event2 = createTestEvent({
        _id: "event-2",
        title: "Event 2",
      });
      (event2 as Event_Core & { order?: number }).order = 1;

      await repository.create([event1, event2]);

      const order: Payload_Order[] = [
        { _id: "event-2", order: 0 },
        { _id: "event-1", order: 1 },
      ];

      await repository.reorder(order);

      const updatedEvent1 = mockEvents.get("event-1");
      const updatedEvent2 = mockEvents.get("event-2");
      expect((updatedEvent1 as Event_Core & { order?: number })?.order).toBe(1);
      expect((updatedEvent2 as Event_Core & { order?: number })?.order).toBe(0);
    });

    it("should only update order for events in the order array", async () => {
      const event1 = createTestEvent({
        _id: "event-1",
        title: "Event 1",
      });
      (event1 as Event_Core & { order?: number }).order = 0;

      const event2 = createTestEvent({
        _id: "event-2",
        title: "Event 2",
      });
      (event2 as Event_Core & { order?: number }).order = 1;

      const event3 = createTestEvent({
        _id: "event-3",
        title: "Event 3",
      });
      (event3 as Event_Core & { order?: number }).order = 2;

      await repository.create([event1, event2, event3]);

      const order: Payload_Order[] = [{ _id: "event-1", order: 5 }];

      await repository.reorder(order);

      const updatedEvent1 = mockEvents.get("event-1");
      const updatedEvent2 = mockEvents.get("event-2");
      const updatedEvent3 = mockEvents.get("event-3");
      expect((updatedEvent1 as Event_Core & { order?: number })?.order).toBe(5);
      expect((updatedEvent2 as Event_Core & { order?: number })?.order).toBe(1); // Unchanged
      expect((updatedEvent3 as Event_Core & { order?: number })?.order).toBe(2); // Unchanged
    });
  });
});

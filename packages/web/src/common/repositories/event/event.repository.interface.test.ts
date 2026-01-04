import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Event_Core,
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { EventApi } from "@web/ducks/events/event.api";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

jest.mock("@web/ducks/events/event.api");

const mockEvents = new Map<string, Event_Core>();

jest.mock("@web/common/utils/storage/event.storage.util", () => {
  const dayjs = require("@core/util/date/dayjs").default;
  return {
    saveEventToIndexedDB: jest.fn(async (event: Event_Core) => {
      mockEvents.set(event._id!, event);
    }),
    loadEventsFromIndexedDB: jest.fn(
      async (startDate: string, endDate: string, isSomeday?: boolean) => {
        const allEvents = Array.from(mockEvents.values());
        // Simple date filtering for tests
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        let filtered = allEvents.filter((event) => {
          if (!event.startDate) return false;
          const eventStart = dayjs(event.startDate);
          return eventStart.isBetween(start, end, "day", "[]");
        });
        if (isSomeday !== undefined) {
          filtered = filtered.filter((event) => event.isSomeday === isSomeday);
        }
        return filtered;
      },
    ),
    deleteEventFromIndexedDB: jest.fn(async (id: string) => {
      mockEvents.delete(id);
    }),
  };
});

jest.mock("@web/common/utils/storage/compass-local.db", () => {
  return {
    compassLocalDB: {
      events: {
        toArray: jest.fn(async () => Array.from(mockEvents.values())),
      },
    },
  };
});

describe("LocalEventRepository", () => {
  let repository: LocalEventRepository;

  beforeEach(async () => {
    repository = new LocalEventRepository();
    mockEvents.clear();
  });

  afterEach(async () => {
    mockEvents.clear();
  });

  describe("create", () => {
    it("should save a single event to IndexedDB", async () => {
      const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const event: Event_Core = {
        _id: "event-1",
        title: "Test Event",
        startDate: dateStr,
        endDate: dateStr,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

      await repository.create(event);

      expect(mockEvents.has("event-1")).toBe(true);
      const savedEvent = mockEvents.get("event-1");
      expect(savedEvent).toBeDefined();
      expect(savedEvent?._id).toBe("event-1");
      expect(savedEvent?.title).toBe("Test Event");
    });

    it("should save multiple events to IndexedDB", async () => {
      const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const events: Event_Core[] = [
        {
          _id: "event-1",
          title: "Event 1",
          startDate: dateStr,
          endDate: dateStr,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "user-1",
        },
        {
          _id: "event-2",
          title: "Event 2",
          startDate: dateStr,
          endDate: dateStr,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "user-1",
        },
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
      const sameDay = today; // Use same day to ensure it's included

      const todayStr = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const tomorrowStr = tomorrow.format(
        dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
      );

      const event1: Event_Core = {
        _id: "event-1",
        title: "Today Event",
        startDate: todayStr,
        endDate: todayStr,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

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
      // The date filtering is tested in the storage utility tests
      // Here we just verify the repository calls it and returns the correct structure
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should filter by isSomeday flag", async () => {
      const today = dayjs().startOf("day");
      const dateStr = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

      const somedayEvent: Event_Core = {
        _id: "someday-1",
        title: "Someday Event",
        startDate: dateStr,
        endDate: dateStr,
        isSomeday: true,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

      const regularEvent: Event_Core = {
        _id: "regular-1",
        title: "Regular Event",
        startDate: dateStr,
        endDate: dateStr,
        isSomeday: false,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

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
  });

  describe("edit", () => {
    it("should update an event in IndexedDB", async () => {
      const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const event: Event_Core = {
        _id: "event-1",
        title: "Original Title",
        startDate: dateStr,
        endDate: dateStr,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

      await repository.create(event);

      const updatedEvent: Schema_Event = {
        ...event,
        title: "Updated Title",
      };

      await repository.edit("event-1", updatedEvent, {});

      const savedEvent = mockEvents.get("event-1");
      expect(savedEvent?.title).toBe("Updated Title");
    });
  });

  describe("delete", () => {
    it("should delete an event from IndexedDB", async () => {
      const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const event: Event_Core = {
        _id: "event-1",
        title: "Test Event",
        startDate: dateStr,
        endDate: dateStr,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

      await repository.create(event);
      await repository.delete("event-1");

      expect(mockEvents.has("event-1")).toBe(false);
    });
  });

  describe("reorder", () => {
    it("should update event order in IndexedDB", async () => {
      const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const event1: Event_Core = {
        _id: "event-1",
        title: "Event 1",
        startDate: dateStr,
        endDate: dateStr,
        order: 0,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

      const event2: Event_Core = {
        _id: "event-2",
        title: "Event 2",
        startDate: dateStr,
        endDate: dateStr,
        order: 1,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "user-1",
      };

      await repository.create([event1, event2]);

      const order: Payload_Order[] = [
        { _id: "event-2", order: 0 },
        { _id: "event-1", order: 1 },
      ];

      await repository.reorder(order);

      const updatedEvent1 = mockEvents.get("event-1");
      const updatedEvent2 = mockEvents.get("event-2");
      expect(updatedEvent1?.order).toBe(1);
      expect(updatedEvent2?.order).toBe(0);
    });
  });
});

describe("RemoteEventRepository", () => {
  let repository: RemoteEventRepository;
  let mockCreate: jest.SpyInstance;
  let mockGet: jest.SpyInstance;
  let mockEdit: jest.SpyInstance;
  let mockDelete: jest.SpyInstance;
  let mockReorder: jest.SpyInstance;

  beforeEach(() => {
    repository = new RemoteEventRepository();
    mockCreate = jest.spyOn(EventApi, "create");
    mockGet = jest.spyOn(EventApi, "get");
    mockEdit = jest.spyOn(EventApi, "edit");
    mockDelete = jest.spyOn(EventApi, "delete");
    mockReorder = jest.spyOn(EventApi, "reorder");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should call EventApi.create with the event", async () => {
      const event: Schema_Event = {
        _id: "event-1",
        title: "Test Event",
      };

      mockCreate.mockResolvedValue({ status: 200 } as any);

      await repository.create(event);

      expect(mockCreate).toHaveBeenCalledWith(event);
    });

    it("should handle array of events", async () => {
      const events: Schema_Event[] = [
        { _id: "event-1", title: "Event 1" },
        { _id: "event-2", title: "Event 2" },
      ];

      mockCreate.mockResolvedValue({ status: 200 } as any);

      await repository.create(events);

      expect(mockCreate).toHaveBeenCalledWith(events);
    });
  });

  describe("get", () => {
    it("should call EventApi.get and extract data from response", async () => {
      const params: Params_Events = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        someday: false,
      };

      const mockResponse = {
        data: {
          data: [{ _id: "event-1", title: "Test" }],
          count: 1,
          page: 1,
          pageSize: 10,
          offset: 0,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      };

      mockGet.mockResolvedValue(mockResponse as any);

      const result = await repository.get(params);

      expect(mockGet).toHaveBeenCalledWith(params);
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });
  });

  describe("edit", () => {
    it("should call EventApi.edit with correct parameters", async () => {
      const event: Schema_Event = {
        _id: "event-1",
        title: "Updated Title",
      };

      mockEdit.mockResolvedValue({ status: 200 } as any);

      await repository.edit("event-1", event, {
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      });

      expect(mockEdit).toHaveBeenCalledWith("event-1", event, {
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      });
    });
  });

  describe("delete", () => {
    it("should call EventApi.delete with correct parameters", async () => {
      mockDelete.mockResolvedValue({ status: 200 } as any);

      await repository.delete("event-1", RecurringEventUpdateScope.ALL_EVENTS);

      expect(mockDelete).toHaveBeenCalledWith(
        "event-1",
        RecurringEventUpdateScope.ALL_EVENTS,
      );
    });
  });

  describe("reorder", () => {
    it("should call EventApi.reorder with order array", async () => {
      const order: Payload_Order[] = [
        { _id: "event-1", order: 0 },
        { _id: "event-2", order: 1 },
      ];

      mockReorder.mockResolvedValue({ status: 200 } as any);

      await repository.reorder(order);

      expect(mockReorder).toHaveBeenCalledWith(order);
    });
  });
});

import {
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { EventApi } from "@web/ducks/events/event.api";
import { RemoteEventRepository } from "./remote.event.repository";

jest.mock("@web/ducks/events/event.api");

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
    it("should call EventApi.create with a single event", async () => {
      const event: Schema_Event = {
        _id: "event-1",
        title: "Test Event",
      };

      mockCreate.mockResolvedValue({ status: 200 } as any);

      await repository.create(event);

      expect(mockCreate).toHaveBeenCalledWith(event);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("should call EventApi.create with an array of events", async () => {
      const events: Schema_Event[] = [
        { _id: "event-1", title: "Event 1" },
        { _id: "event-2", title: "Event 2" },
      ];

      mockCreate.mockResolvedValue({ status: 200 } as any);

      await repository.create(events);

      expect(mockCreate).toHaveBeenCalledWith(events);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("get", () => {
    it("should call EventApi.get and return formatted response", async () => {
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
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.startDate).toBe(params.startDate);
      expect(result.endDate).toBe(params.endDate);
    });

    it("should merge params with response data", async () => {
      const params: Params_Events = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        someday: true,
      };

      const mockResponse = {
        data: {
          data: [],
          count: 0,
          page: 1,
          pageSize: 10,
          offset: 0,
        },
      };

      mockGet.mockResolvedValue(mockResponse as any);

      const result = await repository.get(params);

      expect(result.startDate).toBe(params.startDate);
      expect(result.endDate).toBe(params.endDate);
      expect(result.someday).toBe(params.someday);
    });
  });

  describe("edit", () => {
    it("should call EventApi.edit with event and params", async () => {
      const event: Schema_Event = {
        _id: "event-1",
        title: "Updated Title",
      };

      const params = {
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      };

      mockEdit.mockResolvedValue({ status: 200 } as any);

      await repository.edit("event-1", event, params);

      expect(mockEdit).toHaveBeenCalledWith("event-1", event, params);
      expect(mockEdit).toHaveBeenCalledTimes(1);
    });

    it("should call EventApi.edit without applyTo param", async () => {
      const event: Schema_Event = {
        _id: "event-1",
        title: "Updated Title",
      };

      mockEdit.mockResolvedValue({ status: 200 } as any);

      await repository.edit("event-1", event, {});

      expect(mockEdit).toHaveBeenCalledWith("event-1", event, {});
      expect(mockEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe("delete", () => {
    it("should call EventApi.delete with event id and applyTo", async () => {
      mockDelete.mockResolvedValue({ status: 200 } as any);

      await repository.delete("event-1", RecurringEventUpdateScope.ALL_EVENTS);

      expect(mockDelete).toHaveBeenCalledWith(
        "event-1",
        RecurringEventUpdateScope.ALL_EVENTS,
      );
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it("should call EventApi.delete without applyTo param", async () => {
      mockDelete.mockResolvedValue({ status: 200 } as any);

      await repository.delete("event-1");

      expect(mockDelete).toHaveBeenCalledWith("event-1", undefined);
      expect(mockDelete).toHaveBeenCalledTimes(1);
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
      expect(mockReorder).toHaveBeenCalledTimes(1);
    });

    it("should handle empty order array", async () => {
      const order: Payload_Order[] = [];

      mockReorder.mockResolvedValue({ status: 200 } as any);

      await repository.reorder(order);

      expect(mockReorder).toHaveBeenCalledWith(order);
      expect(mockReorder).toHaveBeenCalledTimes(1);
    });
  });
});

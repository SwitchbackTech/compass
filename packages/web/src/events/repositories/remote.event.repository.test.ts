import { type EventId } from "@core/types/domain-primitives";
import {
  type CreateEventInput,
  type EventListQuery,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  isBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "@web/api/util/backend-unavailable-error.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockCreate = mock();
const mockList = mock();
const mockGetById = mock();
const mockReplace = mock();
const mockDelete = mock();
const mockReorder = mock();
const mockTransition = mock();
const mockPutEvent = mock();
const mockGetEvents = mock();
const mockGetAllEvents = mock();

mock.module("@web/events/event.api", () => ({
  EventApi: {
    create: mockCreate,
    list: mockList,
    getById: mockGetById,
    replace: mockReplace,
    delete: mockDelete,
    reorder: mockReorder,
    transition: mockTransition,
  },
}));

mock.module(
  "@web/common/storage/offline-data/offline-data.store.registry",
  () => ({
    ensureOfflineDataStoreReady: mock().mockResolvedValue(undefined),
    getOfflineDataStore: () => ({
      getEvents: mockGetEvents,
      getAllEvents: mockGetAllEvents,
      putEvent: mockPutEvent,
    }),
    initializeOfflineDataStore: mock().mockResolvedValue(undefined),
    isOfflineDataStoreReady: mock().mockReturnValue(true),
    resetOfflineDataStore: mock(),
    resetOfflineDataStoreAsync: mock().mockResolvedValue(undefined),
  }),
);

const { RemoteEventRepository } =
  require("./remote.event.repository") as typeof import("./remote.event.repository");
type RemoteEventRepositoryInstance = InstanceType<typeof RemoteEventRepository>;

function createBackendUnavailableError(): Error {
  const error = new Error("Request failed");
  error.name = "ApiError";
  return error;
}

describe("RemoteEventRepository", () => {
  let repository: RemoteEventRepositoryInstance;

  beforeEach(() => {
    mockCreate.mockClear();
    mockList.mockClear();
    mockGetById.mockClear();
    mockReplace.mockClear();
    mockDelete.mockClear();
    mockReorder.mockClear();
    mockTransition.mockClear();
    mockPutEvent.mockClear();
    mockGetEvents.mockClear();
    mockGetAllEvents.mockClear();
    resetBackendAvailabilityForTests();
    repository = new RemoteEventRepository();
  });

  describe("create", () => {
    it("calls EventApi.create with the command input", async () => {
      const event = createMockEvent();
      const input: CreateEventInput = {
        calendarId: event.calendarId,
        content: event.content as CreateEventInput["content"],
        schedule: event.schedule,
        recurrence: { kind: "single" as const },
        priority: event.priority,
      };

      mockCreate.mockResolvedValue(event);

      const result = await repository.create(input);

      expect(mockCreate).toHaveBeenCalledWith(input);
      expect(result).toEqual(event);
    });

    it("falls back to the local repository when the backend is unavailable", async () => {
      const event = createMockEvent();
      const input: CreateEventInput = {
        calendarId: event.calendarId,
        content: event.content as CreateEventInput["content"],
        schedule: event.schedule,
        recurrence: { kind: "single" as const },
        priority: event.priority,
      };

      mockCreate.mockRejectedValue(createBackendUnavailableError());
      mockPutEvent.mockResolvedValue(undefined);

      await repository.create(input);

      expect(mockPutEvent).toHaveBeenCalledTimes(1);
      expect(isBackendUnavailable()).toBe(true);
    });
  });

  describe("list", () => {
    it("calls EventApi.list and returns its events", async () => {
      const events = [createMockEvent()];
      mockList.mockResolvedValue(events);

      const query = {
        kind: "range" as const,
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-01-31T00:00:00.000Z",
        priorities: [],
      } as unknown as EventListQuery;
      const result = await repository.list(query);

      expect(mockList).toHaveBeenCalledWith(query);
      expect(result).toEqual(events);
    });

    it("loads local events when the backend is unavailable", async () => {
      const localEvents = [createMockEvent()];
      const query = {
        kind: "someday" as const,
        period: "week" as const,
        anchorDate: "2024-01-01",
      } as unknown as EventListQuery;

      mockList.mockRejectedValue(createBackendUnavailableError());
      mockGetEvents.mockResolvedValue(
        localEvents.map((event) => ({ id: event.id, event })),
      );

      const result = await repository.list(query);

      expect(mockGetEvents).toHaveBeenCalledWith(query);
      expect(result).toEqual(localEvents);
    });
  });

  describe("delete", () => {
    it("calls EventApi.delete with the event id and scope", async () => {
      mockDelete.mockResolvedValue(undefined);

      await repository.delete("event-1" as EventId, "all");

      expect(mockDelete).toHaveBeenCalledWith("event-1", "all");
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("reorder", () => {
    it("calls EventApi.reorder with the reorder input", async () => {
      const input = {
        period: "week" as const,
        items: [{ eventId: "event-1" as EventId, sortOrder: 0 }],
      };

      mockReorder.mockResolvedValue(undefined);

      await repository.reorder(input);

      expect(mockReorder).toHaveBeenCalledWith(input);
      expect(mockReorder).toHaveBeenCalledTimes(1);
    });
  });

  describe("transition", () => {
    it("calls EventApi.transition with the transition input", async () => {
      const event = createMockEvent();
      const input = {
        kind: "unschedule" as const,
        schedule: {
          kind: "someday" as const,
          period: "week" as const,
          anchorDate: "2024-01-01",
          sortOrder: 0,
        },
      } as unknown as TransitionEventInput;

      mockTransition.mockResolvedValue(event);

      const result = await repository.transition(event.id, input);

      expect(mockTransition).toHaveBeenCalledWith(event.id, input);
      expect(result).toEqual(event);
    });
  });
});

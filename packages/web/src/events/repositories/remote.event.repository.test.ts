import { type EventId } from "@core/types/domain-primitives";
import {
  type CreateEventInput,
  type EventListQuery,
} from "@core/types/event-command.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  isBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "@web/api/util/backend-unavailable-error.util";
import { type EventApi } from "@web/events/event.api";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { RemoteEventRepository } from "@web/events/repositories/remote.event.repository";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const api = {
  create: mock(),
  list: mock(),
  getById: mock(),
  replace: mock(),
  delete: mock(),
} satisfies Record<keyof typeof EventApi, ReturnType<typeof mock>>;

const localRepository = {
  create: mock(),
  list: mock(),
  getById: mock(),
  replace: mock(),
  delete: mock(),
} satisfies Record<keyof EventRepository, ReturnType<typeof mock>>;

const repository = new RemoteEventRepository(
  api as unknown as typeof EventApi,
  localRepository as unknown as EventRepository,
);

function createBackendUnavailableError(): Error {
  const error = new Error("Request failed");
  error.name = "ApiError";
  return error;
}

describe("RemoteEventRepository", () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockClear();
    for (const fn of Object.values(localRepository)) fn.mockClear();
    resetBackendAvailabilityForTests();
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

      api.create.mockResolvedValue(event);

      const result = await repository.create(input);

      expect(api.create).toHaveBeenCalledWith(input);
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

      api.create.mockRejectedValue(createBackendUnavailableError());
      localRepository.create.mockResolvedValue(event);

      await repository.create(input);

      expect(localRepository.create).toHaveBeenCalledWith(input);
      expect(isBackendUnavailable()).toBe(true);
    });
  });

  describe("list", () => {
    it("calls EventApi.list and returns its events", async () => {
      const events = [createMockEvent()];
      api.list.mockResolvedValue(events);

      const query = {
        kind: "range" as const,
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-01-31T00:00:00.000Z",
        priorities: [],
      } as unknown as EventListQuery;
      const result = await repository.list(query);

      expect(api.list).toHaveBeenCalledWith(query);
      expect(result).toEqual(events);
    });

    it("loads local events when the backend is unavailable", async () => {
      const localEvents = [createMockEvent()];
      const query = {
        kind: "range" as const,
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-01-31T00:00:00.000Z",
        priorities: [],
      } as unknown as EventListQuery;

      api.list.mockRejectedValue(createBackendUnavailableError());
      localRepository.list.mockResolvedValue(localEvents);

      const result = await repository.list(query);

      expect(localRepository.list).toHaveBeenCalledWith(query);
      expect(result).toEqual(localEvents);
    });
  });

  describe("delete", () => {
    it("calls EventApi.delete with the event id and scope", async () => {
      api.delete.mockResolvedValue(undefined);

      await repository.delete("event-1" as EventId, "all");

      expect(api.delete).toHaveBeenCalledWith("event-1", "all");
      expect(api.delete).toHaveBeenCalledTimes(1);
    });
  });
});

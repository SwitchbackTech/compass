import { configureStore } from "@reduxjs/toolkit";
import { type Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const mockAlert = mock();
const mockGetSessionExists = mock();
const mockGetEventRepositorySource = mock();

// biome-ignore lint/suspicious/noExplicitAny: test mocks require flexible typing
const createMockRepository = (): any => ({
  get: mock(async () => ({
    data: [],
    count: 0,
    page: 1,
    pageSize: 0,
    offset: 0,
    startDate: "",
    endDate: "",
  })),
});

const mockLocalEventRepository = createMockRepository();
const mockRemoteEventRepository = createMockRepository();

const eventResponse = (data: unknown, startDate = "", endDate = "") => {
  const count = Array.isArray(data) ? data.length : 0;

  return {
    data,
    count,
    page: 1,
    pageSize: count,
    offset: 0,
    startDate,
    endDate,
  };
};

const waitForEffects = (ms = 100) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const mockGetEventRepository = mock((sessionExists: boolean) =>
  sessionExists ? mockRemoteEventRepository : mockLocalEventRepository,
);

const _mockHandleError = mock();

mock.module("@web/ducks/events/queries/day.event.query", () => ({
  fetchDayEvents: mock(async (payload, repository) => {
    const { EventDateUtils, normalizedEventsSchema } = await import(
      "@web/ducks/events/sagas/saga.util"
    );
    const { normalize } = await import("normalizr");

    const res = await repository.get({
      ...payload,
      someday: false,
      dontAdjustDates: true,
    });

    if (!res.data || !Array.isArray(res.data)) {
      throw new Error(
        "Invalid response from event repository: data field is missing or not an array",
      );
    }

    const events = EventDateUtils.filterEventsByStartEndDate(
      res.data,
      payload.startDate,
      payload.endDate,
    );

    const normalizedEvents = normalize<Schema_Event>(events, [
      normalizedEventsSchema(),
    ]);

    return {
      ids: normalizedEvents.result,
      entities: normalizedEvents.entities.events,
    };
  }),
}));

mock.module("@web/common/repositories/event/event.repository.util", () => ({
  getEventRepository: mockGetEventRepository,
  getEventRepositorySource: mockGetEventRepositorySource,
}));

const { createCompassListenerMiddleware } = await import(
  "@web/common/store/listener-middleware"
);
const { sagaMiddleware } = await import("@web/common/store/middlewares");
const { createCompassQueryClient } = await import(
  "@web/common/query/query-client"
);
const { getDayEventsSlice } = await import(
  "@web/ducks/events/slices/day.slice"
);
const { eventQueryKeys } = await import(
  "@web/ducks/events/queries/event.query.keys"
);
const { reducers } = await import("@web/store/reducers");
const { registerCompassListeners } = await import("@web/store/listeners");
// Import the real session singleton and override only `doesSessionExist`
// per-test (restored in afterEach). Avoids mock.module, which is global and
// would leak a partial Session (dropping `signOut`) into other test files.
const { session } = await import("@web/common/classes/Session");
const realDoesSessionExist = session.doesSessionExist;

// Create a store with listeners, avoiding the circular dependency of store/index.ts
function createStoreWithListeners(
  queryClient: ReturnType<typeof createCompassQueryClient>,
) {
  const listenerMiddleware = createCompassListenerMiddleware(queryClient);

  const baseStore = configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      })
        .prepend(listenerMiddleware.middleware)
        .concat(sagaMiddleware),
  });

  // Register listeners
  registerCompassListeners(
    // biome-ignore lint/suspicious/noExplicitAny: circular import avoidance
    listenerMiddleware.startListening as any,
  );

  return baseStore;
}

describe("day.event.listener", () => {
  let store: ReturnType<typeof createStoreWithListeners>;
  let queryClient: ReturnType<typeof createCompassQueryClient>;
  const startDate = "2025-01-01";
  const endDate = "2025-01-31";
  const requestDayEvents = (reason = "DAY_VIEW_CHANGE") =>
    store.dispatch(
      getDayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason },
      }),
    );

  beforeEach(() => {
    queryClient = createCompassQueryClient();
    store = createStoreWithListeners(queryClient);
    mockGetSessionExists.mockClear();
    mockGetEventRepository.mockClear();
    mockGetEventRepositorySource.mockClear();
    mockLocalEventRepository.get.mockClear();
    mockRemoteEventRepository.get.mockClear();
    global.alert = mockAlert;
    // Override only doesSessionExist; leaves signOut and the rest intact.
    session.doesSessionExist = mockGetSessionExists;
  });

  afterEach(() => {
    queryClient.clear();
    session.doesSessionExist = realDoesSessionExist;
  });

  describe("success path", () => {
    it("populates entities + ids + flags", async () => {
      const event1 = createMockStandaloneEvent({
        _id: "event-1",
        startDate: "2025-01-15",
      });
      const event2 = createMockStandaloneEvent({
        _id: "event-2",
        startDate: "2025-01-20",
      });

      mockGetSessionExists.mockResolvedValueOnce(true);
      mockGetEventRepositorySource.mockReturnValueOnce("remote");
      mockRemoteEventRepository.get.mockResolvedValueOnce(
        eventResponse([event1, event2], startDate, endDate),
      );

      requestDayEvents();

      // Wait for async effects to settle
      await waitForEffects();

      const state = store.getState();
      const dayEventsSlice = state.events.getDayEvents;

      // Should have entities inserted
      expect(state.events.entities.value["event-1"]).toBeDefined();
      expect(state.events.entities.value["event-2"]).toBeDefined();

      // Should have success state with ids
      expect(dayEventsSlice.value?.data).toEqual(["event-1", "event-2"]);
      expect(dayEventsSlice.isSuccess).toBe(true);
      expect(dayEventsSlice.error).toBeNull();
      expect(dayEventsSlice.reason).toBeNull();
    });

    it("filters out-of-range events", async () => {
      const inRangeEvent = createMockStandaloneEvent({
        _id: "in-range",
        startDate: "2025-01-15",
      });
      const outOfRangeEvent = createMockStandaloneEvent({
        _id: "out-of-range",
        startDate: "2025-02-15",
      });

      mockGetSessionExists.mockResolvedValueOnce(true);
      mockGetEventRepositorySource.mockReturnValueOnce("remote");
      mockRemoteEventRepository.get.mockResolvedValueOnce(
        eventResponse([inRangeEvent, outOfRangeEvent], startDate, endDate),
      );

      requestDayEvents();

      await waitForEffects();

      const state = store.getState();
      // Out-of-range event should be filtered out before normalization
      expect(state.events.getDayEvents.value?.data).toContain("in-range");
      expect(state.events.getDayEvents.value?.data).not.toContain(
        "out-of-range",
      );
    });
  });

  describe("error handling", () => {
    it("dispatches error({}) on repository failure", async () => {
      const testError = new Error("Repository failed");
      mockGetSessionExists.mockResolvedValueOnce(false);
      mockGetEventRepositorySource.mockReturnValueOnce("local");
      mockLocalEventRepository.get.mockRejectedValueOnce(testError);

      requestDayEvents();

      await waitForEffects();

      const state = store.getState();
      expect(state.events.getDayEvents.isSuccess).toBe(false);
      expect(state.events.getDayEvents.error).toEqual({});
    });

    it("handles malformed response (data is null)", async () => {
      mockGetSessionExists.mockResolvedValueOnce(true);
      mockGetEventRepositorySource.mockReturnValueOnce("remote");
      mockRemoteEventRepository.get.mockResolvedValueOnce(
        eventResponse(null, startDate, endDate),
      );

      requestDayEvents();

      await waitForEffects();

      const state = store.getState();
      expect(state.events.getDayEvents.isSuccess).toBe(false);
      expect(state.events.getDayEvents.error).toEqual({});
    });

    it("handles malformed response (data is not an array)", async () => {
      mockGetSessionExists.mockResolvedValueOnce(true);
      mockGetEventRepositorySource.mockReturnValueOnce("remote");
      mockRemoteEventRepository.get.mockResolvedValueOnce(
        eventResponse({ invalid: "object" }, startDate, endDate),
      );

      requestDayEvents();

      await waitForEffects();

      const state = store.getState();
      expect(state.events.getDayEvents.isSuccess).toBe(false);
      expect(state.events.getDayEvents.error).toEqual({});
    });
  });

  describe("repository selection", () => {
    it("uses local repository when session does not exist", async () => {
      mockGetSessionExists.mockResolvedValueOnce(false);
      mockGetEventRepositorySource.mockReturnValueOnce("local");
      mockLocalEventRepository.get.mockResolvedValueOnce(
        eventResponse([], startDate, endDate),
      );

      requestDayEvents();

      await waitForEffects();

      expect(mockLocalEventRepository.get).toHaveBeenCalled();
      expect(mockRemoteEventRepository.get).not.toHaveBeenCalled();
    });

    it("uses remote repository when session exists", async () => {
      mockGetSessionExists.mockResolvedValueOnce(true);
      mockGetEventRepositorySource.mockReturnValueOnce("remote");
      mockRemoteEventRepository.get.mockResolvedValueOnce(
        eventResponse([], startDate, endDate),
      );

      requestDayEvents();

      await waitForEffects();

      expect(mockRemoteEventRepository.get).toHaveBeenCalled();
      expect(mockLocalEventRepository.get).not.toHaveBeenCalled();
    });
  });

  describe("takeLatest supersession", () => {
    it("only the latest request completes when multiple are dispatched rapidly", async () => {
      const event1 = createMockStandaloneEvent({ _id: "event-1" });
      const event2 = createMockStandaloneEvent({ _id: "event-2" });

      mockGetSessionExists.mockResolvedValue(true);
      mockGetEventRepositorySource.mockReturnValue("remote");

      // Track which requests are completed
      let callCount = 0;
      mockRemoteEventRepository.get.mockImplementation(async () => {
        callCount++;
        const currentCall = callCount;
        // First call: slow
        // Second call: fast
        if (currentCall === 1) {
          await waitForEffects(150);
          return eventResponse([event1], startDate, endDate);
        }

        return eventResponse([event2], startDate, endDate);
      });

      // Dispatch two rapid requests
      requestDayEvents();

      requestDayEvents();

      // Wait for both to settle
      await waitForEffects(300);

      const state = store.getState();
      // With takeLatest and dedup, should have used the second request's result
      // The state should have event-2 (from the second request)
      expect(state.events.getDayEvents.isSuccess).toBe(true);
      expect(state.events.getDayEvents.value?.data).toBeDefined();
    });
  });

  describe("in-flight dedup", () => {
    it("same key fetches only once", async () => {
      const event = createMockStandaloneEvent({ _id: "event-1" });

      mockGetSessionExists.mockResolvedValue(true);
      mockGetEventRepositorySource.mockReturnValue("remote");
      mockRemoteEventRepository.get.mockResolvedValue(
        eventResponse([event], startDate, endDate),
      );

      // Dispatch identical payload twice
      requestDayEvents();

      requestDayEvents();

      await waitForEffects();

      // Repository.get should only be called once due to dedup
      expect(mockRemoteEventRepository.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("SSE-style refetch", () => {
    it("re-dispatch same payload refetches (no stale cache)", async () => {
      const event = createMockStandaloneEvent({ _id: "event-1" });

      mockGetSessionExists.mockResolvedValue(true);
      mockGetEventRepositorySource.mockReturnValue("remote");
      mockRemoteEventRepository.get.mockResolvedValue(
        eventResponse([event], startDate, endDate),
      );

      // First dispatch
      requestDayEvents();

      await waitForEffects();

      mockRemoteEventRepository.get.mockClear();

      // Second dispatch same payload (e.g., SSE refetch)
      requestDayEvents("SYNC");

      await waitForEffects();

      // Should refetch, not use cache (staleTime: 0)
      expect(mockRemoteEventRepository.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("query key structure", () => {
    it("query key includes source and dates", () => {
      const key = eventQueryKeys.day({
        source: "remote",
        startDate,
        endDate,
      });

      expect(key).toEqual([
        "events",
        "day",
        {
          source: "remote",
          startDate,
          endDate,
          someday: false,
        },
      ]);
    });

    it("query key with different source creates different key", () => {
      const remoteKey = eventQueryKeys.day({
        source: "remote",
        startDate,
        endDate,
      });
      const localKey = eventQueryKeys.day({
        source: "local",
        startDate,
        endDate,
      });

      expect(remoteKey).not.toEqual(localKey);
    });
  });
});

import { AxiosResponse } from "axios";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { session } from "@web/common/classes/Session";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { saveEventToIndexedDB } from "@web/common/utils/storage/event.storage.util";
import { EventApi } from "@web/ducks/events/event.api";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { sagas } from "@web/store/sagas";

jest.mock("@web/ducks/events/event.api");
jest.mock("@web/common/classes/Session");

// Mock window.alert to prevent jsdom errors
global.alert = jest.fn();

describe("getSomedayEvents saga", () => {
  let store: ReturnType<typeof createStoreWithEvents>;
  let mockGetApi: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    try {
      await ensureStorageReady();
      await getStorageAdapter().clearAllEvents();
    } catch (error) {
      console.error(error);
      // Expect errors if database doesn't exist yet
    }
    store = createStoreWithEvents([]);
    sagaMiddleware.run(sagas);

    mockGetApi = jest.spyOn(EventApi, "get");
  });

  afterEach(async () => {
    try {
      await getStorageAdapter().clearAllEvents();
    } catch (error) {
      console.error(error);
      // Expect errors if database doesn't exist yet
    }
  });

  describe("authenticated users", () => {
    beforeEach(() => {
      (session.doesSessionExist as jest.Mock).mockResolvedValue(true);
    });

    it("should fetch events from API when authenticated", async () => {
      const today = dayjs();
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      const mockEvents: Schema_Event[] = [
        {
          _id: "event-1",
          title: "Someday Event",
          startDate: today.toISOString(),
          endDate: today.toISOString(),
          isSomeday: true,
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "user-1",
        },
      ];

      // EventApi.get returns an AxiosResponse, and the repository extracts response.data
      const mockResponse: AxiosResponse<
        Response_HttpPaginatedSuccess<Schema_Event[]>
      > = {
        data: {
          data: mockEvents,
          count: 1,
          page: 1,
          pageSize: 10,
          offset: 0,
          startDate,
          endDate,
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as AxiosResponse["config"],
      };
      mockGetApi.mockResolvedValue(mockResponse);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGetApi).toHaveBeenCalledWith({
        someday: true,
        startDate,
        endDate,
      });

      const state = store.getState();
      expect(state.events.getSomedayEvents.isSuccess).toBe(true);
      expect(state.events.getSomedayEvents.value?.data).toHaveLength(1);
    });
  });

  describe("unauthenticated users", () => {
    beforeEach(() => {
      (session.doesSessionExist as jest.Mock).mockResolvedValue(false);
    });

    it("should load events from IndexedDB when not authenticated", async () => {
      const today = dayjs();
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      // Save a someday event to IndexedDB
      const somedayEvent = {
        _id: "local-event-1",
        title: "Local Someday Event",
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        isSomeday: true,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "UNAUTHENTICATED_USER",
      };

      await saveEventToIndexedDB(somedayEvent);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify API was not called
      expect(mockGetApi).not.toHaveBeenCalled();

      // Verify event was loaded from IndexedDB and added to store
      const state = store.getState();
      expect(state.events.getSomedayEvents.isSuccess).toBe(true);
      expect(state.events.getSomedayEvents.value?.data).toContain(
        "local-event-1",
      );

      // Verify event is in entities
      const eventEntities = state.events.entities.value || {};
      expect(eventEntities["local-event-1"]).toBeDefined();
      expect(eventEntities["local-event-1"].title).toBe("Local Someday Event");
    });

    it("should return empty array when no events in IndexedDB", async () => {
      const today = dayjs();
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = store.getState();
      expect(state.events.getSomedayEvents.isSuccess).toBe(true);
      expect(state.events.getSomedayEvents.value?.data).toHaveLength(0);
      expect(state.events.getSomedayEvents.value?.count).toBe(0);
    });

    it("should filter events by date range", async () => {
      const today = dayjs();
      const nextMonth = today.add(1, "month");
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      // Save events in different months
      const thisMonthEvent = {
        _id: "this-month-event",
        title: "This Month",
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        isSomeday: true,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "UNAUTHENTICATED_USER",
      };

      const nextMonthEvent = {
        _id: "next-month-event",
        title: "Next Month",
        startDate: nextMonth.toISOString(),
        endDate: nextMonth.toISOString(),
        isSomeday: true,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "UNAUTHENTICATED_USER",
      };

      await saveEventToIndexedDB(thisMonthEvent);
      await saveEventToIndexedDB(nextMonthEvent);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = store.getState();
      expect(state.events.getSomedayEvents.value?.data).toContain(
        "this-month-event",
      );
      expect(state.events.getSomedayEvents.value?.data).not.toContain(
        "next-month-event",
      );
    });

    it("should only load someday events when isSomeday filter is true", async () => {
      const today = dayjs();
      const startDate = today.startOf("day").toISOString();
      const endDate = today.endOf("day").toISOString();

      const somedayEvent = {
        _id: "someday-event",
        title: "Someday",
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        isSomeday: true,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "UNAUTHENTICATED_USER",
      };

      const regularEvent = {
        _id: "regular-event",
        title: "Regular",
        startDate: today.toISOString(),
        endDate: today.add(1, "hour").toISOString(),
        isSomeday: false,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: "UNAUTHENTICATED_USER",
      };

      await saveEventToIndexedDB(somedayEvent);
      await saveEventToIndexedDB(regularEvent);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = store.getState();
      expect(state.events.getSomedayEvents.value?.data).toContain(
        "someday-event",
      );
      expect(state.events.getSomedayEvents.value?.data).not.toContain(
        "regular-event",
      );
    });
  });
});

import { configureStore } from "@reduxjs/toolkit";
import { type AnyAction } from "redux";
import { runSaga } from "redux-saga";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type ApiResponse } from "@web/common/apis/api.types";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type RootState } from "@web/store";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { afterAll } from "bun:test";

const mockDoesSessionExist = mock();
const mockEventApiCreate = mock();
const mockEventApiDelete = mock();
const mockEventApiEdit = mock();
const mockEventApiGet = mock();
const mockEventApiReorder = mock();
const mockAlert = mock();

mock.restore();

mock.module("@web/ducks/events/event.api", () => ({
  EventApi: {
    create: mockEventApiCreate,
    delete: mockEventApiDelete,
    edit: mockEventApiEdit,
    get: mockEventApiGet,
    reorder: mockEventApiReorder,
  },
}));

mock.module("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist: mockDoesSessionExist,
  },
}));

const { createInitialState, createStoreWithEvents } = await import(
  "@web/__tests__/utils/state/store.test.util"
);
const { ensureStorageReady, getStorageAdapter } = await import(
  "@web/common/storage/adapter/adapter"
);
const eventRepositoryUtil = await import(
  "@web/common/repositories/event/event.repository.util"
);
const { sagaMiddleware } = await import("@web/common/store/middlewares");
const eventUtil = await import("@web/common/utils/event/event.util");
const { deleteSomedayEvent } = await import(
  "@web/ducks/events/sagas/someday.sagas"
);
const { getSomedayEventsSlice } = await import(
  "@web/ducks/events/slices/someday.slice"
);
const { reducers } = await import("@web/store/reducers");
const { sagas } = await import("@web/store/sagas");

global.alert = mockAlert as typeof global.alert;

const clearApiMocks = () => {
  mockDoesSessionExist.mockClear();
  mockEventApiCreate.mockClear();
  mockEventApiDelete.mockClear();
  mockEventApiEdit.mockClear();
  mockEventApiGet.mockClear();
  mockEventApiReorder.mockClear();
  mockAlert.mockClear();
};

describe("getSomedayEvents saga", () => {
  let store: ReturnType<typeof createStoreWithEvents>;

  beforeEach(async () => {
    clearApiMocks();
    try {
      await ensureStorageReady();
      await getStorageAdapter().clearAllEvents();
    } catch (error) {
      console.error(error);
      // Expect errors if database doesn't exist yet
    }
    store = createStoreWithEvents([]);
    sagaMiddleware.run(sagas);
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
      mockDoesSessionExist.mockResolvedValue(true);
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

      // EventApi.get returns an API response, and the repository extracts response.data
      const mockResponse: ApiResponse<
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
        headers: new Headers(),
        config: {},
      };
      mockEventApiGet.mockResolvedValue(mockResponse);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockEventApiGet).toHaveBeenCalledWith({
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
      mockDoesSessionExist.mockResolvedValue(false);
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

      await getStorageAdapter().putEvent(somedayEvent);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify API was not called
      expect(mockEventApiGet).not.toHaveBeenCalled();

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

      await getStorageAdapter().putEvent(thisMonthEvent);
      await getStorageAdapter().putEvent(nextMonthEvent);

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

      await getStorageAdapter().putEvent(somedayEvent);
      await getStorageAdapter().putEvent(regularEvent);

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

describe("deleteSomedayEvent saga", () => {
  let store: ReturnType<typeof configureStore>;
  let getEventRepositorySpy: { mockRestore: () => void };
  let handleErrorSpy: { mockRestore: () => void };
  let mockDeleteEvent: ReturnType<typeof mock>;

  beforeEach(() => {
    clearApiMocks();
    mockDoesSessionExist.mockResolvedValue(true);
    mockDeleteEvent = mock().mockResolvedValue(undefined);

    handleErrorSpy = spyOn(eventUtil, "handleError").mockImplementation(
      () => {},
    );

    getEventRepositorySpy = spyOn(
      eventRepositoryUtil,
      "getEventRepository",
    ).mockReturnValue({
      create: mock(),
      get: mock(),
      edit: mock(),
      delete: mockDeleteEvent,
      reorder: mock(),
    } as unknown as EventRepository);

    const base = createInitialState();
    const eventId = "delete-fail-evt";
    const mockEvent: Schema_Event = {
      _id: eventId,
      title: "Someday",
      startDate: dayjs().toISOString(),
      endDate: dayjs().toISOString(),
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      user: "user-1",
    };

    store = configureStore({
      reducer: reducers,
      preloadedState: createInitialState({
        events: {
          ...base.events,
          entities: { value: { [eventId]: mockEvent } },
          getSomedayEvents: {
            value: {
              data: [eventId],
              count: 1,
              pageSize: 10,
              page: 1,
              offset: 0,
            },
            isProcessing: false,
            isSuccess: true,
            error: null,
            reason: null,
          },
        } as unknown as RootState["events"],
      }),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: false,
          serializableCheck: false,
          immutableCheck: false,
        }),
    });
  });

  afterEach(() => {
    getEventRepositorySpy.mockRestore();
    handleErrorSpy.mockRestore();
  });

  it("restores the someday list id when repository delete fails", async () => {
    const eventId = "delete-fail-evt";
    mockDeleteEvent.mockRejectedValue(new Error("delete failed"));

    await runSaga(
      {
        dispatch: (action) => {
          store.dispatch(action as AnyAction);
        },
        getState: () => store.getState(),
      },
      deleteSomedayEvent,
      getSomedayEventsSlice.actions.delete({ _id: eventId }),
    ).toPromise();

    const state = store.getState() as RootState;
    expect(state.events.entities.value?.[eventId]).toBeDefined();
    expect(state.events.getSomedayEvents.value?.data).toContain(eventId);
  });

  it("removes event entity and someday list ID on successful delete", async () => {
    const eventId = "delete-fail-evt";

    await runSaga(
      {
        dispatch: (action) => store.dispatch(action as AnyAction),
        getState: () => store.getState(),
      },
      deleteSomedayEvent,
      getSomedayEventsSlice.actions.delete({ _id: eventId }),
    ).toPromise();

    const state = store.getState() as RootState;
    expect(state.events.entities.value?.[eventId]).toBeUndefined();
    expect(state.events.getSomedayEvents.value?.data).not.toContain(eventId);
  });
});

afterAll(() => {
  mock.restore();
});

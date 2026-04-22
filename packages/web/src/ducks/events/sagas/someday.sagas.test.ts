import { runSaga } from "redux-saga";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

mock.restore();

const mockDoesSessionExist = mock();
const mockGetEventRepository = mock();
const mockRepository = {
  create: mock(),
  delete: mock(),
  edit: mock(),
  get: mock(),
  reorder: mock(),
};
const mockAlert = mock();

mock.module("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist: mockDoesSessionExist,
  },
}));

mock.module("@web/common/repositories/event/event.repository.util", () => ({
  getEventRepository: mockGetEventRepository,
}));

const { createStoreWithEvents } = await import(
  "@web/__tests__/utils/state/store.test.util"
);
const { sagaMiddleware } = await import("@web/common/store/middlewares");
const { deleteSomedayEvent } = await import(
  "@web/ducks/events/sagas/someday.sagas"
);
const { getSomedayEventsSlice } = await import(
  "@web/ducks/events/slices/someday.slice"
);
const { sagas } = await import("@web/store/sagas");

global.alert = mockAlert as typeof global.alert;

const clearApiMocks = () => {
  mockDoesSessionExist.mockClear();
  mockGetEventRepository.mockClear();
  mockRepository.create.mockClear();
  mockRepository.delete.mockClear();
  mockRepository.edit.mockClear();
  mockRepository.get.mockClear();
  mockRepository.reorder.mockClear();
  mockAlert.mockClear();
};

describe("getSomedayEvents saga", () => {
  let store: ReturnType<typeof createStoreWithEvents>;
  let sagaTask: { cancel: () => void } | undefined;

  beforeEach(() => {
    clearApiMocks();
    mockGetEventRepository.mockReturnValue(mockRepository);
    store = createStoreWithEvents([]);
    sagaTask = sagaMiddleware.run(sagas);
  });

  afterEach(() => {
    sagaTask?.cancel();
    sagaTask = undefined;
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

      const mockResponse: Response_HttpPaginatedSuccess<Schema_Event[]> = {
        data: mockEvents,
        count: 1,
        page: 1,
        pageSize: 10,
        offset: 0,
        startDate,
        endDate,
      };
      mockRepository.get.mockResolvedValue(mockResponse);

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockRepository.get).toHaveBeenCalledWith({
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

    it("should load events from the repository when not authenticated", async () => {
      const today = dayjs();
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      mockRepository.get.mockResolvedValue({
        data: [
          {
            _id: "local-event-1",
            title: "Local Someday Event",
            startDate: today.toISOString(),
            endDate: today.toISOString(),
            isSomeday: true,
            origin: Origin.COMPASS,
            priority: Priorities.UNASSIGNED,
            user: "UNAUTHENTICATED_USER",
          },
        ],
        count: 1,
        page: 1,
        pageSize: 10,
        offset: 0,
        startDate,
        endDate,
      });

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockRepository.get).toHaveBeenCalledTimes(1);

      const state = store.getState();
      expect(state.events.getSomedayEvents.isSuccess).toBe(true);
      expect(state.events.getSomedayEvents.value?.data).toContain(
        "local-event-1",
      );

      const eventEntities = state.events.entities.value || {};
      expect(eventEntities["local-event-1"]).toBeDefined();
      expect(eventEntities["local-event-1"].title).toBe("Local Someday Event");
    });

    it("should return empty array when no events are returned", async () => {
      const today = dayjs();
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      mockRepository.get.mockResolvedValue({
        data: [],
        count: 0,
        page: 1,
        pageSize: 10,
        offset: 0,
        startDate,
        endDate,
      });

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
      const startDate = today.startOf("month").toISOString();
      const endDate = today.endOf("month").toISOString();

      mockRepository.get.mockResolvedValue({
        data: [
          {
            _id: "this-month-event",
            title: "This Month",
            startDate: today.toISOString(),
            endDate: today.toISOString(),
            isSomeday: true,
            origin: Origin.COMPASS,
            priority: Priorities.UNASSIGNED,
            user: "UNAUTHENTICATED_USER",
          },
        ],
        count: 1,
        page: 1,
        pageSize: 10,
        offset: 0,
        startDate,
        endDate,
      });

      const action = getSomedayEventsSlice.actions.request({
        startDate,
        endDate,
        __context: { reason: "test" },
      });

      store.dispatch(action);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = store.getState();
      expect(state.events.getSomedayEvents.isSuccess).toBe(true);
      expect(state.events.getSomedayEvents.value?.data).toContain(
        "this-month-event",
      );
    });
  });
});

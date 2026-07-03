import { waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchSomedayEvents = mock(async () => ({
  ids: ["someday-1"],
  entities: {
    "someday-1": {
      _id: "someday-1",
      title: "Read a book",
      isSomeday: true,
      startDate: "2025-11-10",
      endDate: "2025-11-12",
    },
  },
  pagination: {
    data: [],
    count: 1,
    page: 1,
    pageSize: 1,
    offset: 0,
  },
}));

mock.module("@web/ducks/events/queries/someday.event.query", () => ({
  fetchSomedayEvents,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { createCompassQueryClient } =
  require("@web/common/query/query-client") as typeof import("@web/common/query/query-client");
const { createCompassStore } =
  require("@web/store") as typeof import("@web/store");
const { useSomedayEventsQuery } =
  require("@web/ducks/events/queries/useSomedayEventsQuery") as typeof import("@web/ducks/events/queries/useSomedayEventsQuery");

describe("useSomedayEventsQuery", () => {
  beforeEach(() => {
    fetchSomedayEvents.mockClear();
  });

  it("syncs fetched someday events (with pagination) into Redux", async () => {
    const queryClient = createCompassQueryClient();
    const store = createCompassStore({ queryClient });
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    renderHook(() => useSomedayEventsQuery(start), { queryClient, store });

    await waitFor(() => {
      expect(store.getState().events.getSomedayEvents.value?.data).toEqual([
        "someday-1",
      ]);
    });
    expect(store.getState().events.entities.value["someday-1"]).toBeDefined();
    expect(store.getState().events.getSomedayEvents.value?.count).toBe(1);
  });

  it("dispatches slice error when the fetch rejects", async () => {
    fetchSomedayEvents.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const queryClient = createCompassQueryClient();
    const store = createCompassStore({ queryClient });
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    renderHook(() => useSomedayEventsQuery(start), { queryClient, store });

    await waitFor(() => {
      expect(store.getState().events.getSomedayEvents.error).not.toBeNull();
    });
  });
});

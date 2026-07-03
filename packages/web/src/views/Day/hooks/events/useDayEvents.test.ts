import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchDayEvents = mock(async () => ({
  ids: ["event-1"],
  entities: {
    "event-1": {
      _id: "event-1",
      title: "Focus",
      startDate: "2025-11-11T09:00:00",
      endDate: "2025-11-11T10:00:00",
    },
  },
}));

mock.module("@web/ducks/events/queries/day.event.query", () => ({
  fetchDayEvents,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { createCompassQueryClient } =
  require("@web/common/query/query-client") as typeof import("@web/common/query/query-client");
const { useDayEvents } =
  require("@web/views/Day/hooks/events/useDayEvents") as typeof import("@web/views/Day/hooks/events/useDayEvents");

const createStore = () =>
  configureStore({
    preloadedState: createInitialState(),
    reducer: reducers,
  });

describe("useDayEvents", () => {
  beforeEach(() => {
    fetchDayEvents.mockClear();
  });

  it("fetches day events into the query cache", async () => {
    const queryClient = createCompassQueryClient();
    const store = createStore();
    const date = dayjs.utc("2025-11-11T00:00:00Z");

    renderHook(() => useDayEvents(date), { queryClient, store });

    await waitFor(() => {
      expect(fetchDayEvents).toHaveBeenCalledTimes(1);
    });
    expect(
      queryClient.getQueriesData({ queryKey: ["events", "day"] })[0]?.[1],
    ).toEqual(expect.objectContaining({ ids: ["event-1"] }));
  });

  it("re-fetches with a new key when the date changes", async () => {
    const queryClient = createCompassQueryClient();
    const store = createStore();
    const initialDate = dayjs.utc("2025-11-11T00:00:00Z");

    const { rerender } = renderHook(({ date }) => useDayEvents(date), {
      initialProps: { date: initialDate },
      queryClient,
      store,
    });

    await waitFor(() => {
      expect(fetchDayEvents).toHaveBeenCalledTimes(1);
    });
    const callsAfterFirst = fetchDayEvents.mock.calls.length;

    rerender({ date: initialDate.add(1, "day") });

    await waitFor(() => {
      expect(fetchDayEvents.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
  });
});

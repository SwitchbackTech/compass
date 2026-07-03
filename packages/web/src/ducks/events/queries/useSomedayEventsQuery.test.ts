import { waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchSomedayEvents = mock(async () => ({
  ids: ["664e21f9a6b3f0b1c2d3e4f5"],
  entities: {
    "664e21f9a6b3f0b1c2d3e4f5": {
      _id: "664e21f9a6b3f0b1c2d3e4f5",
      title: "Read a book",
      isSomeday: true,
      startDate: "2025-11-10",
      endDate: "2025-11-12",
      origin: "compass",
      priority: "unassigned",
      user: "user-1",
      order: 0,
      updatedAt: new Date("2025-11-01T00:00:00Z"),
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

  it("returns fetched someday events without syncing Redux", async () => {
    const queryClient = createCompassQueryClient();
    const store = createCompassStore({ queryClient });
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    const result = renderHook(() => useSomedayEventsQuery(start), {
      queryClient,
      store,
    });

    await waitFor(() => {
      expect(result.result.current.data?.ids).toEqual([
        "664e21f9a6b3f0b1c2d3e4f5",
      ]);
    });
    expect(result.result.current.data?.pagination.count).toBe(1);
  });

  it("returns query error without reporting it globally", async () => {
    fetchSomedayEvents.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const queryClient = createCompassQueryClient();
    const store = createCompassStore({ queryClient });
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    const result = renderHook(() => useSomedayEventsQuery(start), {
      queryClient,
      store,
    });

    await waitFor(() => {
      expect(result.result.current.error?.message).toBe("boom");
    });
  });
});

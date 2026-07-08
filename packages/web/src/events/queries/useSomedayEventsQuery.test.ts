import { waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type SomedayEventQueryData } from "./event.query.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const fetchSomedayEvents = mock(
  async (): Promise<SomedayEventQueryData> => ({
    ids: ["664e21f9a6b3f0b1c2d3e4f5"],
    entities: {
      "664e21f9a6b3f0b1c2d3e4f5": {
        _id: "664e21f9a6b3f0b1c2d3e4f5",
        title: "Read a book",
        isSomeday: true,
        startDate: "2025-11-10",
        endDate: "2025-11-12",
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
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
  }),
);

mock.module("@web/events/queries/someday.event.query", () => ({
  fetchSomedayEvents,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { createCompassQueryClient } =
  require("@web/common/query/query-client") as typeof import("@web/common/query/query-client");
const { useSomedayEventsQuery } =
  require("@web/events/queries/useSomedayEventsQuery") as typeof import("@web/events/queries/useSomedayEventsQuery");

describe("useSomedayEventsQuery", () => {
  beforeEach(() => {
    fetchSomedayEvents.mockClear();
  });

  it("returns fetched someday events without syncing Redux", async () => {
    const queryClient = createCompassQueryClient();
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    const result = renderHook(() => useSomedayEventsQuery(start), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.result.current.data?.ids).toEqual([
        "664e21f9a6b3f0b1c2d3e4f5",
      ]);
    });
    expect(result.result.current.data?.pagination.count).toBe(1);
  });

  it("keeps the previous month's list visible while the next month fetches", async () => {
    const someday = (id: string, title: string): SomedayEventQueryData => ({
      ids: [id],
      entities: {
        [id]: {
          _id: id,
          title,
          isSomeday: true,
          startDate: "2025-11-10",
          endDate: "2025-11-12",
          origin: Origin.COMPASS,
          priority: Priorities.UNASSIGNED,
          user: "user-1",
          order: 0,
          updatedAt: new Date("2025-11-01T00:00:00Z"),
        },
      },
      pagination: { data: [], count: 1, page: 1, pageSize: 1, offset: 0 },
    });
    const monthA = someday("monthA-event", "November task");
    const monthB = someday("monthB-event", "December task");
    let resolveMonthB!: (value: SomedayEventQueryData) => void;
    const monthBPromise = new Promise<SomedayEventQueryData>((resolve) => {
      resolveMonthB = resolve;
    });

    fetchSomedayEvents.mockImplementationOnce(async () => monthA);
    const queryClient = createCompassQueryClient();

    const { rerender, result } = renderHook(
      ({ start }: { start: Dayjs }) => useSomedayEventsQuery(start),
      {
        initialProps: { start: dayjs.utc("2025-11-10T00:00:00Z") },
        queryClient,
      },
    );

    await waitFor(() => {
      expect(result.current.data?.ids).toEqual(["monthA-event"]);
    });

    fetchSomedayEvents.mockImplementationOnce(() => monthBPromise);
    rerender({ start: dayjs.utc("2025-12-10T00:00:00Z") });

    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(true);
      expect(result.current.data?.ids).toEqual(["monthA-event"]);
    });

    resolveMonthB(monthB);

    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(false);
      expect(result.current.data?.ids).toEqual(["monthB-event"]);
    });
  });

  it("returns query error without reporting it globally", async () => {
    fetchSomedayEvents.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const queryClient = createCompassQueryClient();
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    const result = renderHook(() => useSomedayEventsQuery(start), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.result.current.error?.message).toBe("boom");
    });
  });
});

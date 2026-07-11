import { waitFor } from "@testing-library/react";
import { SomedayScheduleSchema } from "@core/types/event.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type NormalizedEventQueryData } from "./event.query.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const someday = (title: string): NormalizedEventQueryData => {
  const event = createMockEvent({
    content: { kind: "details", title, description: "" },
    schedule: SomedayScheduleSchema.parse({
      kind: "someday",
      period: "week",
      anchorDate: "2025-11-10",
      sortOrder: 0,
    }),
  });
  return { ids: [event.id], entities: { [event.id]: event } };
};

const EMPTY: NormalizedEventQueryData = { ids: [], entities: {} };

const fetchSomedayEvents = mock(
  async (payload: {
    period: "week" | "month";
  }): Promise<NormalizedEventQueryData> =>
    payload.period === "week" ? someday("Read a book") : EMPTY,
);

mock.module("@web/events/queries/someday.event.query", () => ({
  fetchSomedayEvents,
}));

const { renderHook } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { createCompassQueryClient } =
  require("@web/api/query-client") as typeof import("@web/api/query-client");
const { useSomedayEventsQuery } =
  require("@web/events/queries/useSomedayEventsQuery") as typeof import("@web/events/queries/useSomedayEventsQuery");

describe("useSomedayEventsQuery", () => {
  beforeEach(() => {
    fetchSomedayEvents.mockClear();
    fetchSomedayEvents.mockImplementation(async (payload) =>
      payload.period === "week" ? someday("Read a book") : EMPTY,
    );
  });

  it("merges the week and month bucket reads into one result", async () => {
    const queryClient = createCompassQueryClient();
    const start = dayjs.utc("2025-11-10T00:00:00Z");

    const result = renderHook(() => useSomedayEventsQuery(start), {
      queryClient,
    });

    await waitFor(() => {
      expect(result.result.current.data?.ids).toHaveLength(1);
    });
    // Two independent reads: one "week" bucket, one "month" bucket.
    expect(fetchSomedayEvents.mock.calls.length).toBe(2);
    const periods = fetchSomedayEvents.mock.calls.map(
      ([payload]) => payload.period,
    );
    expect(periods.sort()).toEqual(["month", "week"]);
  });

  it("keeps the previous bucket's list visible while the next anchor fetches", async () => {
    const monthA = someday("November task");
    let resolveMonthB!: (value: NormalizedEventQueryData) => void;
    const monthBPromise = new Promise<NormalizedEventQueryData>((resolve) => {
      resolveMonthB = resolve;
    });

    fetchSomedayEvents.mockImplementation(async (payload) =>
      payload.period === "week" ? EMPTY : monthA,
    );
    const queryClient = createCompassQueryClient();

    const { rerender, result } = renderHook(
      ({ start }: { start: Dayjs }) => useSomedayEventsQuery(start),
      {
        initialProps: { start: dayjs.utc("2025-11-10T00:00:00Z") },
        queryClient,
      },
    );

    await waitFor(() => {
      expect(result.current.data?.ids).toEqual(monthA.ids);
    });

    const monthB = someday("December task");
    fetchSomedayEvents.mockImplementation(async (payload) =>
      payload.period === "week" ? EMPTY : monthBPromise,
    );
    rerender({ start: dayjs.utc("2025-12-10T00:00:00Z") });

    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(true);
      expect(result.current.data?.ids).toEqual(monthA.ids);
    });

    resolveMonthB(monthB);

    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(false);
      expect(result.current.data?.ids).toEqual(monthB.ids);
    });
  });

  it("returns query error without reporting it globally", async () => {
    fetchSomedayEvents.mockImplementation(async () => {
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

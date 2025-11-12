import { renderHook } from "@testing-library/react";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { RootState } from "@web/store";
import { useDayEvents } from "./useDayEvents";

const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn();

jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: RootState) => unknown) =>
    mockUseAppSelector(selector),
}));

const createState = ({
  events = {},
  isProcessing = false,
  error = null,
}: {
  events?: Record<string, Schema_Event>;
  isProcessing?: boolean;
  error?: unknown;
} = {}) =>
  ({
    events: {
      getDayEvents: {
        isProcessing,
        isSuccess: !isProcessing,
        error,
        value: null,
        reason: null,
      },
      entities: {
        value: events,
      },
    },
  }) as RootState;

describe("useDayEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockImplementation((selector) =>
      selector(createState()),
    );
  });

  it("dispatches a request for the provided date", () => {
    const date = dayjs("2024-02-10");
    renderHook(() => useDayEvents(date));

    const expectedStart = toUTCOffset(date.startOf("day"));
    const expectedEnd = toUTCOffset(date.endOf("day"));

    expect(mockDispatch).toHaveBeenCalledWith(
      getDayEventsSlice.actions.request({
        startDate: expectedStart,
        endDate: expectedEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  });

  it("filters events by date and excludes someday events", () => {
    const dayStart = dayjs("2024-02-10T00:00:00.000Z");
    const events: Record<string, Schema_Event> = {
      "event-1": {
        _id: "event-1",
        title: "Morning Meeting",
        startDate: dayStart.add(2, "hour").toISOString(),
        endDate: dayStart.add(3, "hour").toISOString(),
        isAllDay: false,
        isSomeday: false,
      } as Schema_Event,
      "event-2": {
        _id: "event-2",
        title: "All Day",
        startDate: dayStart.toISOString(),
        endDate: dayStart.add(1, "day").toISOString(),
        isAllDay: true,
        isSomeday: false,
      } as Schema_Event,
      "event-3": {
        _id: "event-3",
        title: "Someday",
        startDate: dayStart.toISOString(),
        endDate: dayStart.add(1, "hour").toISOString(),
        isAllDay: false,
        isSomeday: true,
      } as Schema_Event,
      "event-4": {
        _id: "event-4",
        title: "Other Day",
        startDate: dayStart.add(1, "day").toISOString(),
        endDate: dayStart.add(1, "day").add(1, "hour").toISOString(),
        isAllDay: false,
        isSomeday: false,
      } as Schema_Event,
    };

    const state = createState({ events });
    mockUseAppSelector.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useDayEvents(dayStart));

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events.map((event) => event._id)).toEqual([
      "event-2",
      "event-1",
    ]);
  });

  it("exposes loading state from slice", () => {
    const state = createState({ isProcessing: true });
    mockUseAppSelector.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useDayEvents(dayjs()));

    expect(result.current.isLoading).toBe(true);
  });

  it("exposes string errors from slice", () => {
    const state = createState({ error: "Boom" });
    mockUseAppSelector.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useDayEvents(dayjs()));

    expect(result.current.error).toBe("Boom");
  });

  it("dispatches again when the date changes", () => {
    const firstDate = dayjs("2024-02-10");
    const secondDate = dayjs("2024-02-11");
    const { rerender } = renderHook(
      ({ currentDate }) => useDayEvents(currentDate),
      {
        initialProps: { currentDate: firstDate },
      },
    );

    rerender({ currentDate: secondDate });

    const firstStart = toUTCOffset(firstDate.startOf("day"));
    const firstEnd = toUTCOffset(firstDate.endOf("day"));
    const secondStart = toUTCOffset(secondDate.startOf("day"));
    const secondEnd = toUTCOffset(secondDate.endOf("day"));

    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      getDayEventsSlice.actions.request({
        startDate: firstStart,
        endDate: firstEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );

    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      getDayEventsSlice.actions.request({
        startDate: secondStart,
        endDate: secondEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { EventApi } from "@web/ducks/events/event.api";
import { useDayEvents } from "./day.data";

// Mock EventApi
jest.mock("@web/ducks/events/event.api");
const mockEventApi = EventApi as jest.Mocked<typeof EventApi>;

// Mock console.log to avoid cluttering test output
const consoleSpy = jest.spyOn(console, "log").mockImplementation();

const buildExpectedDateRange = (dateString: string) => ({
  startDate: toUTCOffset(dayjs(dateString).startOf("day")),
  endDate: toUTCOffset(dayjs(dateString).endOf("day")),
});
describe("useDayEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockClear();
    mockEventApi.get.mockResolvedValue({ data: [] } as never);
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it("should return loading state initially", async () => {
    const testDate = dayjs("2024-01-15");
    const expectedDateRange = buildExpectedDateRange("2024-01-15");
    const { result } = renderHook(() => useDayEvents(testDate));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(mockEventApi.get).toHaveBeenCalledWith({
        ...expectedDateRange,
        someday: false,
      });
    });
  });

  it("should fetch events successfully", async () => {
    const mockEvents = [
      {
        _id: "event-1",
        title: "Morning Meeting",
        startDate: "2024-01-15T09:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
        isAllDay: false,
      },
      {
        _id: "event-2",
        title: "Afternoon Call",
        startDate: "2024-01-15T14:00:00Z",
        endDate: "2024-01-15T15:00:00Z",
        isAllDay: false,
      },
    ];

    mockEventApi.get.mockResolvedValue({
      data: mockEvents,
    } as never);

    const testDate = dayjs("2024-01-15");
    const expectedDateRange = buildExpectedDateRange("2024-01-15");
    const { result } = renderHook(() => useDayEvents(testDate));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
    expect(mockEventApi.get).toHaveBeenCalledWith({
      ...expectedDateRange,
      someday: false,
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Day events:",
      expect.objectContaining({
        events: mockEvents,
        loadingTime: expect.any(Number),
        dateRange: expectedDateRange,
        count: 2,
      }),
    );
  });

  it("should handle API errors", async () => {
    const errorMessage = "Network error";
    mockEventApi.get.mockRejectedValue(new Error(errorMessage));

    const testDate = dayjs("2024-01-15");
    const expectedDateRange = buildExpectedDateRange("2024-01-15");
    const { result } = renderHook(() => useDayEvents(testDate));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Day events error:",
      expect.objectContaining({
        error: errorMessage,
        loadingTime: expect.any(Number),
        dateRange: expectedDateRange,
      }),
    );
  });

  it("should handle timeout errors", async () => {
    jest.useFakeTimers();

    // Mock a promise that never resolves
    mockEventApi.get.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const testDate = dayjs("2024-01-15");
    const expectedDateRange = buildExpectedDateRange("2024-01-15");
    const { result } = renderHook(() => useDayEvents(testDate));

    // Fast-forward time to trigger timeout
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBe("Request timeout");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Day events error:",
      expect.objectContaining({
        error: "Request timeout",
        loadingTime: expect.any(Number),
        dateRange: expectedDateRange,
      }),
    );

    jest.useRealTimers();
  });

  it("should refetch when date changes", async () => {
    const mockEvents1 = [{ _id: "event-1", title: "Event 1" }];
    const mockEvents2 = [{ _id: "event-2", title: "Event 2" }];

    mockEventApi.get
      .mockResolvedValueOnce({ data: mockEvents1 } as never)
      .mockResolvedValueOnce({ data: mockEvents2 } as never);

    const testDate1 = dayjs("2024-01-15");
    const testDate2 = dayjs("2024-01-16");
    const expectedDateRange1 = buildExpectedDateRange("2024-01-15");
    const expectedDateRange2 = buildExpectedDateRange("2024-01-16");

    const { result, rerender } = renderHook(({ date }) => useDayEvents(date), {
      initialProps: { date: testDate1 },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents1);
    expect(mockEventApi.get).toHaveBeenCalledTimes(1);
    expect(mockEventApi.get).toHaveBeenLastCalledWith({
      ...expectedDateRange1,
      someday: false,
    });

    // Change date
    rerender({ date: testDate2 });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents2);
    expect(mockEventApi.get).toHaveBeenCalledTimes(2);
    expect(mockEventApi.get).toHaveBeenLastCalledWith({
      ...expectedDateRange2,
      someday: false,
    });
  });

  it("should format dates correctly using YEAR_MONTH_DAY_FORMAT", async () => {
    mockEventApi.get.mockResolvedValue({ data: [] } as never);

    const testDate = dayjs("2024-12-25");
    const expectedDateRange = buildExpectedDateRange("2024-12-25");
    renderHook(() => useDayEvents(testDate));

    await waitFor(() => {
      expect(mockEventApi.get).toHaveBeenCalledWith({
        ...expectedDateRange,
        someday: false,
      });
    });
  });
});

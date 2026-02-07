import dayjs from "@core/util/date/dayjs";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectImportLatestState } from "@web/ducks/events/selectors/sync.selector";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { resetIsFetchNeeded } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useRefetch } from "@web/views/Calendar/hooks/useRefetch";

// Mock react-router-dom
const mockUseLocation = jest.fn();
const mockUseParams = jest.fn();
jest.mock("react-router-dom", () => ({
  useLocation: () => mockUseLocation(),
  useParams: () => mockUseParams(),
}));

// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn();
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: unknown) => mockUseAppSelector(selector),
}));

// Mock useDateInView
const mockUseDateInView = jest.fn();
jest.mock("@web/views/Day/hooks/navigation/useDateInView", () => ({
  useDateInView: () => mockUseDateInView(),
}));

describe("useRefetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    mockUseAppSelector.mockReset();
    mockUseDateInView.mockReturnValue(dayjs.utc("2024-01-15")); // Default for week view tests
  });

  describe("Week view behavior", () => {
    it("should fetch week events when on week view and fetch is needed", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.WEEK });
      mockUseParams.mockReturnValue({});

      const weekStart = "2024-01-15T00:00:00Z";
      const weekEnd = "2024-01-21T23:59:59Z";

      // selectImportLatestState is called first, selectDatesInView second
      // Add fallback for any additional calls during re-renders
      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: weekStart,
          end: weekEnd,
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: weekStart,
          end: weekEnd,
        });

      renderHook(() => useRefetch());

      expect(mockDispatch).toHaveBeenCalledWith(
        getWeekEventsSlice.actions.request({
          startDate: toUTCOffset(weekStart),
          endDate: toUTCOffset(weekEnd),
          __context: {
            reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          },
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetIsFetchNeeded());
    });

    it("should map SOCKET_EVENT_CHANGED to WEEK_VIEW_CHANGE for week view", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.WEEK });
      mockUseParams.mockReturnValue({});

      const weekStart = "2024-01-15T00:00:00Z";
      const weekEnd = "2024-01-21T23:59:59Z";

      mockUseAppSelector.mockImplementation((selector) => {
        const selectorName = selector?.name || "";
        if (
          selectorName.includes("selectImportLatestState") ||
          selector === selectImportLatestState
        ) {
          return {
            isFetchNeeded: true,
            reason: Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED,
          };
        }
        if (
          selectorName.includes("selectDatesInView") ||
          selector === selectDatesInView
        ) {
          return {
            start: weekStart,
            end: weekEnd,
          };
        }
        return null;
      });

      renderHook(() => useRefetch());

      expect(mockDispatch).toHaveBeenCalledWith(
        getWeekEventsSlice.actions.request({
          startDate: toUTCOffset(weekStart),
          endDate: toUTCOffset(weekEnd),
          __context: {
            reason: Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED,
          },
        }),
      );
    });

    it("should not fetch when fetch is not needed", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.WEEK });
      mockUseParams.mockReturnValue({});

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("Day view behavior", () => {
    it("should fetch day events when on day view and fetch is needed", () => {
      const testDate = "2024-01-15";
      mockUseLocation.mockReturnValue({ pathname: `/day/${testDate}` });
      mockUseParams.mockReturnValue({ date: testDate });

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      const expectedDate = dayjs.utc(testDate);
      const expectedStart = expectedDate.startOf("day").format();
      const expectedEnd = expectedDate.endOf("day").format();

      expect(mockDispatch).toHaveBeenCalledWith(
        getDayEventsSlice.actions.request({
          startDate: expectedStart,
          endDate: expectedEnd,
          __context: {
            reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          },
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetIsFetchNeeded());
    });

    it("should fetch day events when on /day route without date param", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.DAY });
      mockUseParams.mockReturnValue({});

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      // Should use today's date when no date param
      const expectedDate = dayjs.utc("2024-01-15");
      const expectedStart = expectedDate.startOf("day").format();
      const expectedEnd = expectedDate.endOf("day").format();

      expect(mockDispatch).toHaveBeenCalledWith(
        getDayEventsSlice.actions.request({
          startDate: expectedStart,
          endDate: expectedEnd,
          __context: {
            reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          },
        }),
      );
    });

    it("should map SOCKET_EVENT_CHANGED to WEEK_VIEW_CHANGE for day view", () => {
      const testDate = "2024-01-15";
      mockUseLocation.mockReturnValue({ pathname: `/day/${testDate}` });
      mockUseParams.mockReturnValue({ date: testDate });

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      const expectedDate = dayjs.utc(testDate);
      const expectedStart = expectedDate.startOf("day").format();
      const expectedEnd = expectedDate.endOf("day").format();

      expect(mockDispatch).toHaveBeenCalledWith(
        getDayEventsSlice.actions.request({
          startDate: expectedStart,
          endDate: expectedEnd,
          __context: {
            reason: Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED,
          },
        }),
      );
    });
  });

  describe("Someday events handling", () => {
    it("should fetch someday events when SOCKET_SOMEDAY_EVENT_CHANGED reason", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.WEEK });
      mockUseParams.mockReturnValue({});

      const weekStart = "2024-01-15T00:00:00Z";
      const weekEnd = "2024-01-21T23:59:59Z";

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED,
        })
        .mockReturnValueOnce({
          start: weekStart,
          end: weekEnd,
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: weekStart,
          end: weekEnd,
        });

      renderHook(() => useRefetch());

      // Should call getSomedayEventsSlice with computed date range
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("getSomedayEvents/request"),
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetIsFetchNeeded());
    });

    it("should fetch someday events for day view when SOCKET_SOMEDAY_EVENT_CHANGED", () => {
      const testDate = "2024-01-15";
      mockUseLocation.mockReturnValue({ pathname: `/day/${testDate}` });
      mockUseParams.mockReturnValue({ date: testDate });

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      // Should call getSomedayEventsSlice
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("getSomedayEvents/request"),
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(resetIsFetchNeeded());
    });
  });

  describe("View detection", () => {
    it("should detect day view when pathname is /day", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.DAY });
      mockUseParams.mockReturnValue({});

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      // Should use day date range, not week date range
      const expectedDate = dayjs.utc("2024-01-15");
      const expectedStart = expectedDate.startOf("day").format();
      const expectedEnd = expectedDate.endOf("day").format();

      expect(mockDispatch).toHaveBeenCalledWith(
        getDayEventsSlice.actions.request({
          startDate: expectedStart,
          endDate: expectedEnd,
          __context: {
            reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          },
        }),
      );
    });

    it("should detect day view when pathname starts with /day/", () => {
      const testDate = "2024-01-20";
      mockUseLocation.mockReturnValue({ pathname: `/day/${testDate}` });
      mockUseParams.mockReturnValue({ date: testDate });
      mockUseDateInView.mockReturnValue(dayjs.utc(testDate));

      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: "2024-01-15T00:00:00Z",
          end: "2024-01-21T23:59:59Z",
        });

      renderHook(() => useRefetch());

      // Should use the date from URL params, not Redux state
      const expectedStart = "2024-01-20T00:00:00Z";
      const expectedEnd = "2024-01-20T23:59:59Z";

      expect(mockDispatch).toHaveBeenCalledWith(
        getDayEventsSlice.actions.request({
          startDate: expectedStart,
          endDate: expectedEnd,
          __context: {
            reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          },
        }),
      );
    });

    it("should detect week view when pathname is /week", () => {
      mockUseLocation.mockReturnValue({ pathname: ROOT_ROUTES.WEEK });
      mockUseParams.mockReturnValue({});

      const weekStart = "2024-01-15T00:00:00Z";
      const weekEnd = "2024-01-21T23:59:59Z";

      // selectImportLatestState is called first, selectDatesInView second
      // Add fallback for any additional calls during re-renders
      mockUseAppSelector
        .mockReturnValueOnce({
          isFetchNeeded: true,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        })
        .mockReturnValueOnce({
          start: weekStart,
          end: weekEnd,
        })
        .mockReturnValue({
          isFetchNeeded: false,
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          start: weekStart,
          end: weekEnd,
        });

      renderHook(() => useRefetch());

      // Should use week date range from Redux state
      expect(mockDispatch).toHaveBeenCalledWith(
        getWeekEventsSlice.actions.request({
          startDate: toUTCOffset(weekStart),
          endDate: toUTCOffset(weekEnd),
          __context: {
            reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
          },
        }),
      );
    });
  });
});
